# Script PowerShell para atualizar URLs do frontend
# Execute: .\update-frontend-urls.ps1

Write-Host "🔄 Atualizando URLs do frontend...`n" -ForegroundColor Cyan

# 🔧 CONFIGURE SUAS URLs AQUI (após fazer deploy no Render)
$API_URLS = @{
    auth = 'https://chat-backend-main.onrender.com'
    chat = 'https://chat-ia-backend.onrender.com'
    api = 'https://python-backend-api.onrender.com'
    node = 'https://meu-servidor-node.onrender.com'
    admin = 'https://admin-dashboard.onrender.com'
}

Write-Host "⚠️  IMPORTANTE: Edite este arquivo com as URLs reais após o deploy!`n" -ForegroundColor Yellow
Write-Host "URLs configuradas:" -ForegroundColor White
$API_URLS.GetEnumerator() | ForEach-Object {
    Write-Host "   $($_.Key): $($_.Value)" -ForegroundColor Gray
}
Write-Host ""

$updated = 0
$errors = 0

# Atualizar app-premium.html
Write-Host "📝 Atualizando app-premium.html..." -NoNewline
try {
    $filePath = ".\app-premium.html"
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Procurar por const API_BASE_URL ou variável similar
        if ($content -match "const API_BASE_URL\s*=\s*['""][^'""]*['""]") {
            $content = $content -replace "const API_BASE_URL\s*=\s*['""][^'""]*['""]", "const API_BASE_URL = '$($API_URLS.auth)'"
            Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
            Write-Host " ✅" -ForegroundColor Green
            $updated++
        } else {
            Write-Host " ℹ️  URL não encontrada (pode precisar adicionar manualmente)" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ⚠️  Arquivo não encontrado" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    $errors++
}

# Atualizar chat-integration.js
Write-Host "📝 Atualizando chat-integration.js..." -NoNewline
try {
    $filePath = ".\chat-integration.js"
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        if ($content -match "const CHAT_API_URL\s*=\s*['""][^'""]*['""]") {
            $content = $content -replace "const CHAT_API_URL\s*=\s*['""][^'""]*['""]", "const CHAT_API_URL = '$($API_URLS.chat)'"
            Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
            Write-Host " ✅" -ForegroundColor Green
            $updated++
        } else {
            Write-Host " ℹ️  URL não encontrada" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ⚠️  Arquivo não encontrado" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    $errors++
}

# Atualizar login.js
Write-Host "📝 Atualizando login.js..." -NoNewline
try {
    $filePath = ".\login.js"
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        if ($content -match "const AUTH_API_URL\s*=\s*['""][^'""]*['""]") {
            $content = $content -replace "const AUTH_API_URL\s*=\s*['""][^'""]*['""]", "const AUTH_API_URL = '$($API_URLS.auth)'"
            Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
            Write-Host " ✅" -ForegroundColor Green
            $updated++
        } else {
            Write-Host " ℹ️  URL não encontrada" -ForegroundColor Yellow
        }
    } else {
        Write-Host " ⚠️  Arquivo não encontrado" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    $errors++
}

Write-Host "`n📊 Resumo:" -ForegroundColor Cyan
Write-Host "   ✅ Atualizados: $updated" -ForegroundColor Green
Write-Host "   ❌ Erros: $errors" -ForegroundColor Red

if ($errors -eq 0 -and $updated -gt 0) {
    Write-Host "`n✨ URLs atualizadas com sucesso!" -ForegroundColor Green
    Write-Host "`n📋 Próximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Faça deploy dos 5 serviços no Render" -ForegroundColor White
    Write-Host "   2. Anote as URLs reais geradas pelo Render" -ForegroundColor White
    Write-Host "   3. Edite este arquivo (update-frontend-urls.ps1) com as URLs reais" -ForegroundColor White
    Write-Host "   4. Execute novamente: .\update-frontend-urls.ps1" -ForegroundColor White
    Write-Host "   5. Teste o sistema em app-premium.html" -ForegroundColor White
} elseif ($updated -eq 0) {
    Write-Host "`nℹ️  Nenhum arquivo foi atualizado." -ForegroundColor Yellow
    Write-Host "   Possíveis motivos:" -ForegroundColor White
    Write-Host "   - Arquivos não encontrados" -ForegroundColor Gray
    Write-Host "   - Padrão de URL não corresponde" -ForegroundColor Gray
    Write-Host "   - URLs já estão atualizadas" -ForegroundColor Gray
} else {
    Write-Host "`n⚠️  Alguns arquivos não foram atualizados. Verifique os erros acima." -ForegroundColor Yellow
}

Write-Host "`n📚 Documentação:" -ForegroundColor Cyan
Write-Host "   - DEPLOY_RAPIDO.md para instruções de deploy" -ForegroundColor Gray
Write-Host "   - URLS_CONFIG.md para referência de endpoints" -ForegroundColor Gray
Write-Host "   - ARQUITETURA.txt para diagrama dos serviços" -ForegroundColor Gray
