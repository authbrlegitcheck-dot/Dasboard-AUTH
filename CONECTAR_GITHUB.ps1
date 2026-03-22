# Script de Automação para Sincronizar com GitHub

# 1. Configurar Identidade (Opcional, mas recomendado)
write-host "Configurando identidade Git..."
git config user.name "Dasboard User"
git config user.email "usuario@auth.com"

# 2. Inicializar se necessário
if (-not (test-path .git)) {
    write-host "Inicializando repositório Git..."
    git init
}

# 3. Adicionar arquivos
write-host "Adicionando arquivos..."
git add .

# 4. Commit
write-host "Criando primeiro commit..."
git commit -m "Dashboard e CRM Atualizados"

# 5. Adicionar Remoto
write-host "Conectando ao GitHub..."
git remote remove origin 2>$null
git remote add origin https://github.com/authbrlegitcheck-dot/Dasboard-AUTH.git

# 6. Push
write-host "Enviando para o GitHub (Aguarde o popup de login)..."
git branch -M main
git push -u origin main

write-host "CONCLUÍDO! Seu código já está no GitHub."
pause
