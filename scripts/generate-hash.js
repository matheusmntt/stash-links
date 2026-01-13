// Execute este script para gerar o hash da sua senha
// node scripts/generate-hash.js "sua_senha_aqui"

const bcrypt = require("bcryptjs")

const password = process.argv[2]

if (!password) {
  console.log("Uso: node scripts/generate-hash.js <sua_senha>")
  console.log("Exemplo: node scripts/generate-hash.js minhasenhasecreta")
  process.exit(1)
}

const hash = bcrypt.hashSync(password, 10)

const escapedHash = hash.replace(/\$/g, "\\$")

console.log("\n=== Hash gerado ===")
console.log(hash)
console.log("\n=== Adicione no seu .env (com escape) ===")
console.log(`AUTH_PASSWORD_HASH="${escapedHash}"`)
console.log("\n=== OU use aspas simples ===")
console.log(`AUTH_PASSWORD_HASH='${hash}'`)
