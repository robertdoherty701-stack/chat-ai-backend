# 📸 Como Adicionar Sua Logo Personalizada

## Opção 1: Usar imagem da internet (Mais fácil)

1. Encontre uma imagem que você goste
2. Faça upload em um serviço como:
   - **imgur.com** (gratuito, sem cadastro)
   - **postimages.org** (gratuito)
   - Google Drive (compartilhar publicamente)

3. Copie o link direto da imagem
4. No arquivo `app-v2.html`, encontre esta linha:
   ```javascript
   const APP_LOGO = ''; // Cole a URL da sua imagem aqui
   ```

5. Cole a URL entre as aspas:
   ```javascript
   const APP_LOGO = 'https://i.imgur.com/suaimagem.png';
   ```

## Opção 2: Usar imagem local

1. Coloque sua imagem na mesma pasta do arquivo `app-v2.html`
2. Renomeie para algo simples, ex: `logo.png`
3. No arquivo `app-v2.html`:
   ```javascript
   const APP_LOGO = 'logo.png';
   ```

## Mudar o nome do app

Encontre esta linha:
```javascript
const APP_NAME = 'Chat AI Pro'; // Mude o nome aqui
```

Mude para o nome que quiser:
```javascript
const APP_NAME = 'Meu App Incrível';
```

## Dicas para a imagem

- **Formato:** PNG ou JPG
- **Tamanho recomendado:** 500x500 pixels (quadrado)
- **Transparência:** PNG com fundo transparente fica melhor
- **Qualidade:** Use imagem de boa qualidade

## Exemplos de sites para criar logos grátis

- **canva.com** - Design profissional
- **looka.com** - Gerador de logos AI
- **hatchful.shopify.com** - Logos gratuitos

---

**Precisa de ajuda?** Me mande o link ou arquivo da imagem que você quer usar!
