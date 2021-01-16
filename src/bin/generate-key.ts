#! /usr/bin/env node
import sodium from 'sodium-native';

// console.log(`Generating a ${sodium.crypto_secretbox_KEYBYTES}-length key...`);
// const secretboxBuffer = Buffer.allocUnsafe(sodium.crypto_secretbox_KEYBYTES);
// sodium.randombytes_buf(secretboxBuffer);
// console.log(`hex: ${secretboxBuffer.toString('hex')}`);
// console.log(`base64: ${secretboxBuffer.toString('base64')}`);

const publicKey = Buffer.alloc(sodium.crypto_box_PUBLICKEYBYTES);
const secretKey = Buffer.alloc(sodium.crypto_box_SECRETKEYBYTES);
sodium.crypto_box_keypair(publicKey, secretKey);
console.dir({ publicKey: publicKey.toString('base64'), secretKey: secretKey.toString('base64') });
