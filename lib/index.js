'use strict';

const Assert = require('assert');
const Crypto = require('crypto');
const Async = require('async');
const AWS = require('aws-sdk');
const DigestStream = require('digest-stream');


const masterKey = process.env.AWS_MASTER_KEY;
Assert(masterKey, 'env vars must provide AWS_MASTER_KEY');
Assert(process.env.AWS_FILENAME, 'env vars must provide AWS_FILENAME');

// Load credentials from ~/.aws/credentials
const opts = {
    profile: process.env.AWS_PROFILE || 'default'
};
opts.filename = process.env.AWS_FILENAME;
AWS.config.credentials = new AWS.SharedIniFileCredentials(opts);
AWS.config.update({ region: 'us-east-1' });
const KMS = new AWS.KMS({ apiVersion: 'latest' });

// Set private variables
const internals = {
    algorithm: 'aes-256-cbc',
    S3: new AWS.S3({ apiVersion: 'latest' })
};


/**
 * Encrypt and store a file into AWS Simple Storage Service (AWS S3)
 *
 * @param {object} params - The params object
 * @param {string} params.bucketName - Name of the bucket in S3 where we want to store the object
 * @param {string} params.teamId - The id of the team the file belongs to
 * @param {string} params.fileId - The id of the file
 * @param {object} params.file - A readable file stream
 * @param {function} next - Two param err, result callback. If present, result will be an object
 * with the encrypted data key of the stored file `encryptedDataKey` and the file md5, `md5`
 */
exports.encryptAndStoreFile = (params, next) => {

    const bucketName = params.bucketName;
    const teamId = params.teamId;
    const fileId = params.fileId;
    const stream = params.file;
    const objKeyName = `${teamId}.${fileId}`;

    Async.waterfall([
        (callback) => {

            // Create a data key using AWS KMS
            const dataKeyParams = {
                KeyId: masterKey,
                KeySpec: 'AES_256'
            };
            KMS.generateDataKey(dataKeyParams, (err, res) => {

                if (err) {
                    return callback(err);
                }
                const encryptedDataKey = res.CiphertextBlob;
                const unencryptedDataKey = res.Plaintext;
                callback(null, encryptedDataKey, unencryptedDataKey);
            });
        },
        (encryptedDataKey, unencryptedDataKey, callback) => {

            let md5;
            const listener = (md5OfUnencryptedFile) => {

                md5 = md5OfUnencryptedFile;
            };
            // Create through stream to calculate file md5
            const digest = DigestStream('md5', 'hex', listener);

            // Create encryption stream
            const encrypt = Crypto.createCipher(internals.algorithm, unencryptedDataKey);
            const encryptedFile = stream.pipe(digest).pipe(encrypt);

            const s3Params = {
                Bucket: bucketName,
                Key: objKeyName,
                Body: encryptedFile
            };
            internals.S3
                .upload(s3Params)
                .send((err) => {

                    if (err) {
                        return callback(err);
                    }
                    const res = {
                        encryptedDataKey: encryptedDataKey,
                        md5: md5
                    };
                    callback(null, res);
                });
        }
    ], next);
};

/**
 * Retrieve and decrypt a file from AWS S3
 *
 * @param {object} params - The params object
 * @param {string} params.bucketName - Name of the bucket in S3 where we want to store the object
 * @param {string} params.teamId - The id of the team the file belongs to
 * @param {string} params.fileId - The id of the file
 * @param {Buffer} params.encryptedDataKey - Encrypted data key
 * @param {function} next - Two param err, result callback. If present, result will be a readable
 * stream of the requested file
 */
exports.getAndDecryptFile = (params, next) => {

    const bucketName = params.bucketName;
    const teamId = params.teamId;
    const fileId = params.fileId;
    const encryptedDataKey = params.encryptedDataKey;
    const objKeyName = `${teamId}.${fileId}`;

    // Decrypt the data key
    const decParams = { CiphertextBlob: encryptedDataKey };
    KMS.decrypt(decParams, (err, res) => {

        if (err) {
            return next(err);
        }
        const decryptedDataKey = res.Plaintext;

        const objParams = {
            Bucket: bucketName,
            Key: objKeyName
        };
        const fileStream = internals.S3.getObject(objParams).createReadStream();
        const decrypt = Crypto.createDecipher(internals.algorithm, decryptedDataKey);
        let decrypted;
        decrypt.on('error', (err) => {

            return next(err);
        });
        decrypt.on('finish', () => {

            return next(null, decrypted);
        });
        decrypted = fileStream.pipe(decrypt);
    });
};
