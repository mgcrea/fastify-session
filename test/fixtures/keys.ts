import { generateRandomKey } from "src/utils";

export const randomKey = generateRandomKey();
export const getRandomKey = (): Buffer => randomKey;
export const secretKey = Buffer.from("Egb/g4RUumlD2YhWYfeDlm5MddajSjGEBhm0OW+yo9s=", "base64");
