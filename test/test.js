'use strict';

require('dotenv').config();

const Code = require('code');
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const before = lab.beforeEach;
const it = lab.it;
const expect = Code.expect;
const Fs = require('fs');
const Path = require('path');
const Async = require('async');
const Assert = require('assert');

Assert(process.env.AWS_BUCKET_NAME, 'env vars must provide AWS_BUCKET_NAME');

const AwsFileStorage = require('../lib/index');
const tempData = {};
const fileData = {
    file1: { // 362 kb
        path: Path.join(__dirname, '../lib/data/image1.jpg'),
        name: 'image1.jpg',
        fileId: 'file1',
        teamId: 'team1'
    },
    file2: { // 8kb
        path: Path.join(__dirname, '../lib/data/sample1.pdf'),
        name: 'sample1.pdf',
        fileId: 'file2',
        teamId: 'team2'
    },
    file3: { // 4 kb
        path: Path.join(__dirname, '../lib/data/tiny_malin_head.jpg'),
        name: 'tiny_malin_head.jpg',
        fileId: 'file3',
        teamId: 'team3'
    }
};

before((done) => {

    Async.forEachOf(fileData, (file, fileId, callback) => {

        const params = {
            bucketName: process.env.AWS_BUCKET_NAME,
            fileId: fileId,
            teamId: file.teamId,
            file: Fs.createReadStream(file.path)
        };
        AwsFileStorage.encryptAndStoreFile(params, (err, result) => {

            if (err) {
                return callback(err);
            }
            tempData[fileId] = result;
            //console.log('stored: ', file.name);
            callback();
        });
    }, done);
});
describe('downloading files', () => {

    it('retrieves and decrypts a 362kb jpg', (done) => {

        const file = fileData.file1;
        const params = {
            bucketName: process.env.AWS_BUCKET_NAME,
            fileId: file.fileId,
            teamId: file.teamId,
            encryptedDataKey: tempData.file1.encryptedDataKey
        };
        AwsFileStorage.getAndDecryptFile(params, (err, stream) => {

            expect(err).not.to.exist();
            const outPath = Path.join(__dirname, './out/', file.name);
            const out = Fs.createWriteStream(outPath);
            out.on('error', (error) => {

                expect(error).not.to.exist();
            });
            out.on('finish', () => {

                console.log('wrote file to: ', outPath);
                done();
            });
            stream.pipe(out);
        });
    });
    it('retrieves and decrypts a 8kb pdf', (done) => {

        const file = fileData.file2;
        const params = {
            bucketName: process.env.AWS_BUCKET_NAME,
            fileId: file.fileId,
            teamId: file.teamId,
            encryptedDataKey: tempData.file2.encryptedDataKey
        };
        AwsFileStorage.getAndDecryptFile(params, (err, stream) => {

            expect(err).not.to.exist();
            const outPath = Path.join(__dirname, './out/', file.name);
            const out = Fs.createWriteStream(outPath);
            out.on('error', (error) => {

                expect(error).not.to.exist();
            });
            out.on('finish', () => {

                console.log('wrote file to: ', outPath);
                done();
            });
            stream.pipe(out);
        });
    });
    it('retrieves and decrypts a 4kb jpg', (done) => {

        const file = fileData.file3;
        const params = {
            bucketName: process.env.AWS_BUCKET_NAME,
            fileId: file.fileId,
            teamId: file.teamId,
            encryptedDataKey: tempData.file3.encryptedDataKey
        };
        AwsFileStorage.getAndDecryptFile(params, (err, stream) => {

            expect(err).not.to.exist();
            const outPath = Path.join(__dirname, './out/', file.name);
            const out = Fs.createWriteStream(outPath);
            out.on('error', (error) => {

                expect(error).not.to.exist();
            });
            out.on('finish', () => {

                console.log('wrote file to: ', outPath);
                done();
            });
            stream.pipe(out);
        });
    });
});
