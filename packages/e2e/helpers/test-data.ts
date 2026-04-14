export function createRegistrationInput() {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    accountName: `Apiary ${nonce}`,
    email: `beekeeper-${nonce}@example.com`,
    password: "secret123",
  };
}
