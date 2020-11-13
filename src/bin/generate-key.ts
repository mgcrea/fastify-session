#! /usr/bin/env node
import sodium from 'sodium-native';

console.log(`Generating a ${sodium.crypto_secretbox_KEYBYTES}-length key...`);
const secretboxBuffer = Buffer.allocUnsafe(sodium.crypto_secretbox_KEYBYTES);
sodium.randombytes_buf(secretboxBuffer);
console.log(`hex: ${secretboxBuffer.toString('hex')}`);
console.log(`base64: ${secretboxBuffer.toString('base64')}`);
