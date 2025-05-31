require('dotenv').config();
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { Extract } = require('unzipper');

// Configuración
const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_PATH = process.env.BACKUP_PATH || './backups';
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const BACKUP_BUCKET = process.env.BACKUP_R2_BUCKET || R2_BUCKET;

// Cliente R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// Verificar/crear bucket
async function ensureBucketExists(bucketName) {
  try {
    await r2Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`✅ Bucket verificado: ${bucketName}`);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      try {
        await r2Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`✅ Bucket creado: ${bucketName}`);
        return true;
      } catch (createError) {
        console.error(
          `❌ No se pudo crear bucket ${bucketName}:`,
          createError.message
        );
        return false;
      }
    } else {
      console.error(
        `❌ Error verificando bucket ${bucketName}:`,
        error.message
      );
      return false;
    }
  }
}

// Listar backups disponibles
async function listBackups() {
  try {
    console.log('📋 Listando backups disponibles...\n');

    const response = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: BACKUP_BUCKET,
        Prefix: 'backups/',
      })
    );

    if (!response.Contents || response.Contents.length === 0) {
      console.log('❌ No se encontraron backups');
      return [];
    }

    const backups = response.Contents.filter((obj) => obj.Key.endsWith('.zip'))
      .map((obj) => ({
        key: obj.Key,
        name: path.basename(obj.Key),
        size: (obj.Size / 1024 / 1024).toFixed(2) + ' MB',
        date: obj.LastModified.toLocaleString(),
        type: obj.Key.includes('mongodb') ? 'MongoDB' : 'R2',
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log('Backups disponibles:');
    console.log('===================');
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.name}`);
      console.log(`   Tipo: ${backup.type}`);
      console.log(`   Tamaño: ${backup.size}`);
      console.log(`   Fecha: ${backup.date}`);
      console.log('');
    });

    return backups;
  } catch (error) {
    console.error('❌ Error listando backups:', error.message);
    return [];
  }
}

// Descargar backup desde R2
async function downloadBackup(backupKey, localPath) {
  try {
    console.log(`📥 Descargando ${path.basename(backupKey)}...`);

    const response = await r2Client.send(
      new GetObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: backupKey,
      })
    );

    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    fs.writeFileSync(localPath, Buffer.concat(chunks));
    console.log(`✅ Descargado: ${localPath}`);
    return localPath;
  } catch (error) {
    console.error('❌ Error descargando backup:', error.message);
    throw error;
  }
}

// Extraer archivo ZIP
async function extractZip(zipPath, extractPath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(Extract({ path: extractPath }))
      .on('close', resolve)
      .on('error', reject);
  });
}

// Restaurar MongoDB - VERSIÓN CON DEBUG
async function restoreMongoDB(backupPath) {
  console.log('🔄 Restaurando MongoDB...');

  const extractPath = backupPath.replace('.zip', '_extracted');
  fs.mkdirSync(extractPath, { recursive: true });

  try {
    // Extraer backup
    await extractZip(backupPath, extractPath);

    // Buscar archivos de backup
    const files = fs.readdirSync(extractPath);

    if (files.includes('backup.json')) {
      // Restauración directa desde JSON
      console.log('📄 Restaurando desde backup directo...');

      const { MongoClient, ObjectId } = require('mongodb');
      const client = new MongoClient(MONGODB_URI);

      await client.connect();
      const db = client.db();

      const backupData = JSON.parse(
        fs.readFileSync(path.join(extractPath, 'backup.json'), 'utf8')
      );

      for (const [collectionName, documents] of Object.entries(
        backupData.collections
      )) {
        console.log(
          `📋 Restaurando colección: ${collectionName} (${documents.length} documentos)`
        );

        const collection = db.collection(collectionName);

        // Limpiar colección existente
        await collection.deleteMany({});

        // Procesar documentos para asegurar que los ObjectIds se restauren correctamente
        if (documents.length > 0) {
          const processedDocuments = documents.map((doc) => {
            // Si el documento tiene un _id como string, convertirlo a ObjectId
            if (doc._id && typeof doc._id === 'string') {
              try {
                doc._id = new ObjectId(doc._id);
              } catch (e) {
                console.warn(`⚠️ No se pudo convertir _id: ${doc._id}`);
              }
            }

            // Procesar otros campos que podrían ser ObjectIds
            Object.keys(doc).forEach((key) => {
              if (doc[key] && typeof doc[key] === 'object' && doc[key].$oid) {
                try {
                  doc[key] = new ObjectId(doc[key].$oid);
                } catch (e) {
                  console.warn(
                    `⚠️ No se pudo convertir ObjectId en campo ${key}`
                  );
                }
              }
            });

            return doc;
          });

          // Insertar documentos procesados
          await collection.insertMany(processedDocuments, {
            ordered: false,
          });

          // Verificar que se insertaron correctamente
          const insertedCount = await collection.countDocuments();
          console.log(
            `   ✅ ${insertedCount} documentos restaurados con IDs originales`
          );

          // Mostrar algunos IDs para debug
          const sampleDocs = await collection.find({}).limit(3).toArray();
          sampleDocs.forEach((doc) => {
            console.log(
              `   🔍 ID restaurado: ${doc._id} (${doc.title || 'sin título'})`
            );
          });
        }
      }

      await client.close();
      console.log('✅ Restauración directa completada');
    } else {
      // Restauración con mongorestore (preserva IDs automáticamente)
      console.log('📄 Restaurando con mongorestore...');

      try {
        const mongorestoreCommand = `mongorestore --uri="${MONGODB_URI}" --drop --dir="${extractPath}" --preserveUUID`;
        execSync(mongorestoreCommand, { stdio: 'inherit', timeout: 300000 });
        console.log('✅ Restauración con mongorestore completada');
      } catch (mongorestoreError) {
        throw new Error(
          'mongorestore no disponible y no se encontró backup.json'
        );
      }
    }

    // Limpiar archivos temporales
    fs.rmSync(extractPath, { recursive: true, force: true });
  } catch (error) {
    console.error('❌ Error restaurando MongoDB:', error.message);
    throw error;
  }
}

// Restaurar R2
async function restoreR2(backupPath) {
  console.log('🔄 Restaurando R2...');

  const extractPath = backupPath.replace('.zip', '_extracted');
  fs.mkdirSync(extractPath, { recursive: true });

  try {
    // Extraer backup
    await extractZip(backupPath, extractPath);

    // Limpiar bucket actual (opcional - comentar si no quieres borrar)
    console.log('🗑️ Limpiando bucket actual...');
    let continuationToken;

    do {
      const listResponse = await r2Client.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          ContinuationToken: continuationToken,
        })
      );

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Eliminar en lotes de 1000 (límite de AWS)
        const objectsToDelete = listResponse.Contents.map((obj) => ({
          Key: obj.Key,
        }));

        await r2Client.send(
          new DeleteObjectsCommand({
            Bucket: R2_BUCKET,
            Delete: {
              Objects: objectsToDelete,
              Quiet: false,
            },
          })
        );

        console.log(`   🗑️ Eliminados ${objectsToDelete.length} objetos...`);
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    // Subir archivos del backup
    console.log('📤 Subiendo archivos del backup...');
    const files = getAllFiles(extractPath);

    let uploadedCount = 0;
    for (const file of files) {
      const relativePath = path.relative(extractPath, file);

      // Normalizar la ruta (usar / en lugar de \ en Windows)
      const normalizedPath = relativePath.replace(/\\/g, '/');

      const fileStream = fs.createReadStream(file);

      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: normalizedPath,
          Body: fileStream,
          ContentType: getContentType(file), // Agregar Content-Type correcto
        })
      );

      uploadedCount++;
      if (uploadedCount % 10 === 0) {
        console.log(
          `   📤 Subidos ${uploadedCount}/${files.length} archivos...`
        );
      }
    }

    console.log(`✅ Restaurados ${files.length} archivos a R2`);

    // Limpiar archivos temporales
    fs.rmSync(extractPath, { recursive: true, force: true });
  } catch (error) {
    console.error('❌ Error restaurando R2:', error.message);
    throw error;
  }
}

// Función para determinar Content-Type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

// Obtener todos los archivos de un directorio recursivamente
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

// Función de restauración principal
async function restoreFromBackup(backupName = null) {
  console.log('🔄 Iniciando proceso de restauración...\n');

  fs.mkdirSync(BACKUP_PATH, { recursive: true });

  try {
    // Listar backups disponibles
    const backups = await listBackups();

    if (backups.length === 0) {
      console.log('❌ No hay backups disponibles para restaurar');
      return;
    }

    let selectedBackup;

    if (backupName) {
      // Buscar backup específico
      selectedBackup = backups.find((b) => b.name === backupName);
      if (!selectedBackup) {
        console.log(`❌ Backup "${backupName}" no encontrado`);
        return;
      }
    } else {
      // Usar el backup más reciente
      selectedBackup = backups[0];
      console.log(`📦 Usando backup más reciente: ${selectedBackup.name}\n`);
    }

    // Descargar backup
    const localBackupPath = path.join(BACKUP_PATH, selectedBackup.name);
    await downloadBackup(selectedBackup.key, localBackupPath);

    // Restaurar según el tipo
    if (selectedBackup.type === 'MongoDB') {
      await restoreMongoDB(localBackupPath);
    } else if (selectedBackup.type === 'R2') {
      await restoreR2(localBackupPath);
    }

    // Limpiar archivo descargado
    fs.unlinkSync(localBackupPath);

    console.log('\n🎉 Restauración completada exitosamente');
  } catch (error) {
    console.error('💥 Error en restauración:', error.message);
    process.exit(1);
  }
}

// Función de restauración completa (MongoDB + R2)
async function restoreComplete(mongoBackupName = null, r2BackupName = null) {
  console.log('🔄 Iniciando restauración completa (MongoDB + R2)...\n');

  fs.mkdirSync(BACKUP_PATH, { recursive: true });

  try {
    // Listar backups disponibles
    const backups = await listBackups();

    if (backups.length === 0) {
      console.log('❌ No hay backups disponibles para restaurar');
      return;
    }

    // Separar backups por tipo
    const mongoBackups = backups.filter((b) => b.type === 'MongoDB');
    const r2Backups = backups.filter((b) => b.type === 'R2');

    let selectedMongoBackup, selectedR2Backup;

    // Seleccionar backup de MongoDB
    if (mongoBackupName) {
      selectedMongoBackup = mongoBackups.find(
        (b) => b.name === mongoBackupName
      );
      if (!selectedMongoBackup) {
        console.log(`❌ Backup de MongoDB "${mongoBackupName}" no encontrado`);
        return;
      }
    } else {
      selectedMongoBackup = mongoBackups[0]; // Más reciente
      if (!selectedMongoBackup) {
        console.log('❌ No hay backups de MongoDB disponibles');
        return;
      }
    }

    // Seleccionar backup de R2
    if (r2BackupName) {
      selectedR2Backup = r2Backups.find((b) => b.name === r2BackupName);
      if (!selectedR2Backup) {
        console.log(`❌ Backup de R2 "${r2BackupName}" no encontrado`);
        return;
      }
    } else {
      selectedR2Backup = r2Backups[0]; // Más reciente
      if (!selectedR2Backup) {
        console.log('❌ No hay backups de R2 disponibles');
        return;
      }
    }

    console.log('📦 Backups seleccionados:');
    console.log(
      `   MongoDB: ${selectedMongoBackup.name} (${selectedMongoBackup.date})`
    );
    console.log(`   R2: ${selectedR2Backup.name} (${selectedR2Backup.date})`);
    console.log('');

    // === PASO 1: Restaurar MongoDB ===
    console.log('🔄 PASO 1/2: Restaurando MongoDB...');
    const localMongoPath = path.join(BACKUP_PATH, selectedMongoBackup.name);
    await downloadBackup(selectedMongoBackup.key, localMongoPath);
    await restoreMongoDB(localMongoPath);
    fs.unlinkSync(localMongoPath); // Limpiar
    console.log('✅ MongoDB restaurado\n');

    // === PASO 2: Restaurar R2 ===
    console.log('🔄 PASO 2/2: Restaurando R2...');
    const localR2Path = path.join(BACKUP_PATH, selectedR2Backup.name);
    await downloadBackup(selectedR2Backup.key, localR2Path);
    await restoreR2(localR2Path);
    fs.unlinkSync(localR2Path); // Limpiar
    console.log('✅ R2 restaurado\n');

    console.log('🎉 Restauración completa exitosa!');
    console.log('📊 Resumen:');
    console.log(`   ✅ MongoDB: ${selectedMongoBackup.name}`);
    console.log(`   ✅ R2: ${selectedR2Backup.name}`);
  } catch (error) {
    console.error('💥 Error en restauración completa:', error.message);
    process.exit(1);
  }
}

// Función para restaurar desde una fecha específica
async function restoreFromDate(dateString) {
  console.log(`🔄 Restaurando backups del ${dateString}...\n`);

  try {
    const backups = await listBackups();

    // Buscar backups de la fecha especificada
    const mongoBackup = backups.find(
      (b) => b.type === 'MongoDB' && b.name.includes(dateString)
    );

    const r2Backup = backups.find(
      (b) => b.type === 'R2' && b.name.includes(dateString)
    );

    if (!mongoBackup) {
      console.log(
        `❌ No se encontró backup de MongoDB para la fecha ${dateString}`
      );
      return;
    }

    if (!r2Backup) {
      console.log(`❌ No se encontró backup de R2 para la fecha ${dateString}`);
      return;
    }

    // Usar la función de restauración completa
    await restoreComplete(mongoBackup.name, r2Backup.name);
  } catch (error) {
    console.error('💥 Error restaurando por fecha:', error.message);
    process.exit(1);
  }
}

// [Aquí van todas las funciones de backup anteriores - backupMongoDB, backupR2, etc.]
// ... (mantén todas las funciones de backup del código anterior)

// Backup de MongoDB
async function backupMongoDB() {
  const date = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `${BACKUP_PATH}/mongodb_${timestamp}`;

  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📦 Creando backup de MongoDB...`);

  try {
    try {
      const mongodumpCommand = `mongodump --uri="${MONGODB_URI}" --out="${backupDir}"`;
      execSync(mongodumpCommand, { stdio: 'inherit', timeout: 300000 });
      console.log('✅ Backup con mongodump completado');
    } catch (mongodumpError) {
      console.log('⚠️  mongodump no disponible, usando backup directo...');

      const { MongoClient } = require('mongodb');
      const client = new MongoClient(MONGODB_URI);

      await client.connect();
      const db = client.db();
      const collections = await db.listCollections().toArray();

      const backupData = {
        timestamp: new Date().toISOString(),
        database: db.databaseName,
        collections: {},
      };

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        console.log(`📋 Exportando: ${collectionName}`);

        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        backupData.collections[collectionName] = documents;

        console.log(`   └─ ${documents.length} documentos`);
      }

      fs.writeFileSync(
        path.join(backupDir, 'backup.json'),
        JSON.stringify(backupData, null, 2)
      );
      await client.close();
      console.log('✅ Backup directo completado');
    }

    const compressedFile = `${BACKUP_PATH}/mongodb_${date}.zip`;
    console.log('🗜️  Comprimiendo backup...');
    await compressDirectory(backupDir, compressedFile);

    fs.rmSync(backupDir, { recursive: true, force: true });

    const fileSize = (fs.statSync(compressedFile).size / 1024 / 1024).toFixed(
      2
    );
    console.log(
      `✅ MongoDB backup: ${path.basename(compressedFile)} (${fileSize} MB)`
    );

    return compressedFile;
  } catch (error) {
    console.error('❌ Error en backup MongoDB:', error.message);
    throw error;
  }
}

// Backup de R2
async function backupR2() {
  const date = new Date().toISOString().split('T')[0];
  const backupFile = `${BACKUP_PATH}/r2_${date}.zip`;

  console.log(`📦 Creando backup de R2...`);

  try {
    const output = fs.createWriteStream(backupFile);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);

    let continuationToken;
    let totalObjects = 0;

    do {
      const response = await r2Client.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET,
          ContinuationToken: continuationToken,
        })
      );

      if (response.Contents) {
        for (const object of response.Contents) {
          try {
            const objectResponse = await r2Client.send(
              new GetObjectCommand({
                Bucket: R2_BUCKET,
                Key: object.Key,
              })
            );

            const chunks = [];
            for await (const chunk of objectResponse.Body) {
              chunks.push(chunk);
            }

            archive.append(Buffer.concat(chunks), { name: object.Key });
            totalObjects++;

            if (totalObjects % 25 === 0) {
              console.log(`📁 Procesados ${totalObjects} objetos...`);
            }
          } catch (error) {
            console.error(`⚠️  Error con ${object.Key}: ${error.message}`);
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    await archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const fileSize = (fs.statSync(backupFile).size / 1024 / 1024).toFixed(
          2
        );
        console.log(
          `✅ R2 backup: ${path.basename(backupFile)} (${totalObjects} objetos, ${fileSize} MB)`
        );
        resolve(backupFile);
      });
      output.on('error', reject);
      archive.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Error en backup R2:', error.message);
    throw error;
  }
}

// Subir a R2
async function uploadToR2(filePath) {
  try {
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);

    console.log(`☁️  Subiendo ${fileName}...`);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: `backups/${fileName}`,
        Body: fileStream,
      })
    );

    console.log(`✅ Subido: ${fileName}`);
  } catch (error) {
    console.error(
      `❌ Error subiendo ${path.basename(filePath)}:`,
      error.message
    );
    throw error;
  }
}

// Comprimir directorio
function compressDirectory(sourceDir, outputFile) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Limpiar backups antiguos
function cleanOldBackups(daysToKeep = 7) {
  try {
    if (!fs.existsSync(BACKUP_PATH)) return;

    const files = fs.readdirSync(BACKUP_PATH);
    const now = new Date();
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(BACKUP_PATH, file);
      const stats = fs.statSync(filePath);
      const daysDiff = (now - stats.mtime) / (1000 * 60 * 60 * 24);

      if (daysDiff > daysToKeep) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🗑️  Eliminados ${cleaned} backups antiguos`);
    }
  } catch (error) {
    console.error('⚠️  Error limpiando backups:', error.message);
  }
}

// Función principal de backup
async function createFullBackup() {
  const startTime = new Date();
  console.log(`🚀 Iniciando backup completo - ${startTime.toLocaleString()}`);
  console.log('');

  if (
    !MONGODB_URI ||
    !R2_ENDPOINT ||
    !R2_ACCESS_KEY ||
    !R2_SECRET_KEY ||
    !R2_BUCKET
  ) {
    console.error('❌ Faltan variables de entorno. Verifica tu archivo .env');
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_PATH, { recursive: true });

  try {
    console.log('🔍 Verificando buckets...');
    const sourceBucketOk = await ensureBucketExists(R2_BUCKET);
    const backupBucketOk = await ensureBucketExists(BACKUP_BUCKET);

    if (!sourceBucketOk || !backupBucketOk) {
      throw new Error('No se pudieron verificar/crear los buckets necesarios');
    }
    console.log('');

    const mongoBackup = await backupMongoDB();
    await uploadToR2(mongoBackup);
    console.log('');

    const r2Backup = await backupR2();
    await uploadToR2(r2Backup);
    console.log('');

    cleanOldBackups();

    const duration = ((new Date() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Backup completado en ${duration}s`);
  } catch (error) {
    console.error('💥 Error en backup:', error.message);
    process.exit(1);
  }
}

// Agregar función de debug
async function debugDatabase() {
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(MONGODB_URI);

    await client.connect();
    const db = client.db();
    const collection = db.collection('games');

    const games = await collection.find({}).toArray();

    console.log('🔍 Juegos en la base de datos:');
    console.log('============================');

    games.forEach((game, index) => {
      console.log(`${index + 1}. ${game.title}`);
      console.log(`   ID: ${game._id}`);
      console.log(`   Tipo de ID: ${typeof game._id}`);
      console.log('');
    });

    await client.close();
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error.message);
  }
}

// Manejo de comandos
if (process.argv.includes('--manual')) {
  createFullBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (process.argv.includes('--list')) {
  listBackups()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (process.argv.includes('--restore-complete')) {
  const restoreIndex = process.argv.indexOf('--restore-complete') + 1;
  const mongoBackup = process.argv[restoreIndex];
  const r2Backup = process.argv[restoreIndex + 1];

  restoreComplete(mongoBackup, r2Backup)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (process.argv.includes('--restore-date')) {
  const dateIndex = process.argv.indexOf('--restore-date') + 1;
  const dateString = process.argv[dateIndex];

  if (!dateString) {
    console.log('❌ Debe especificar una fecha en formato YYYY-MM-DD');
    console.log('Ejemplo: node backup.js --restore-date 2025-05-31');
    process.exit(1);
  }

  restoreFromDate(dateString)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (process.argv.includes('--restore')) {
  const restoreIndex = process.argv.indexOf('--restore') + 1;
  const backupName = process.argv[restoreIndex];

  restoreFromBackup(backupName)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (process.argv.includes('--debug')) {
  debugDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  console.log('🔧 Sistema de Backup y Restauración');
  console.log('===================================');
  console.log('');
  console.log('Comandos disponibles:');
  console.log('');
  console.log('📦 BACKUP:');
  console.log(
    '  node backup.js --manual                    # Crear backup completo'
  );
  console.log('');
  console.log('📋 LISTAR:');
  console.log(
    '  node backup.js --list                      # Listar backups disponibles'
  );
  console.log('');
  console.log('🔄 RESTAURACIÓN:');
  console.log(
    '  node backup.js --restore-complete          # Restaurar TODO (más reciente)'
  );
  console.log(
    '  node backup.js --restore-date YYYY-MM-DD   # Restaurar TODO de una fecha'
  );
  console.log(
    '  node backup.js --restore                   # Restaurar backup más reciente'
  );
  console.log(
    '  node backup.js --restore <archivo>         # Restaurar backup específico'
  );
  console.log('');
  console.log('🔍 DEBUG:');
  console.log(
    '  node backup.js --debug                     # Verificar base de datos'
  );
  console.log('');
  console.log('Ejemplos:');
  console.log(
    '  node backup.js --restore-complete                    # Todo más reciente'
  );
  console.log(
    '  node backup.js --restore-date 2025-05-31             # Todo del 31 de mayo'
  );
  console.log(
    '  node backup.js --restore mongodb_2025-05-31.zip      # Solo MongoDB'
  );
  console.log(
    '  node backup.js --restore r2_2025-05-31.zip           # Solo R2'
  );
  console.log('');
  console.log('Variables de entorno requeridas:');
  console.log('  MONGODB_URI');
  console.log('  CLOUDFLARE_R2_ENDPOINT');
  console.log('  CLOUDFLARE_R2_ACCESS_KEY');
  console.log('  CLOUDFLARE_R2_SECRET_KEY');
  console.log('  CLOUDFLARE_R2_BUCKET');
  console.log('  BACKUP_R2_BUCKET (opcional)');
}
