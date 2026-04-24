import { USERNAME_MAX } from "./constants";

const GUEST_USERNAME_PREFIX = "guest-";
const GUEST_USERNAME_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const GUEST_USERNAME_SUFFIX_LENGTH = 6;

const getRandomByte = () => Math.floor(Math.random() * 256);

export const generateGuestUsername = (maxLength = USERNAME_MAX) => {
  const values = Array.from({ length: GUEST_USERNAME_SUFFIX_LENGTH }, () =>
    getRandomByte(),
  );

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const cryptoValues = new Uint8Array(GUEST_USERNAME_SUFFIX_LENGTH);
    crypto.getRandomValues(cryptoValues);

    for (let index = 0; index < cryptoValues.length; index += 1) {
      values[index] = cryptoValues[index] ?? getRandomByte();
    }
  }

  const suffix = values
    .map(
      (value) =>
        GUEST_USERNAME_ALPHABET[value % GUEST_USERNAME_ALPHABET.length],
    )
    .join("");

  return `${GUEST_USERNAME_PREFIX}${suffix}`.slice(0, maxLength);
};
