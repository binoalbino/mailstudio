# Imagens no Cloudflare R2

Com o R2 configurado, as imagens enviadas pelo editor vão para o R2 (depois de reduzidas e comprimidas) e deixam de ocupar disco na VPS. Sem as variáveis abaixo, tudo continua sendo salvo na VPS como antes.

## 1. Criar o bucket
1. Acesse dash.cloudflare.com, crie a conta e abra **R2 Object Storage**.
2. **Create bucket**, nome `mail-img`, localização automática.

## 2. Criar a chave de acesso
1. Em **R2 Object Storage → Manage API Tokens → Create API token**.
2. Permissão **Object Read & Write**, limitada ao bucket `mail-img`.
3. Copie o **Access Key ID** e o **Secret Access Key** (o segredo aparece uma vez só).
4. Copie também o **Account ID** (aparece na página inicial do R2).

## 3. Endereço público das imagens
- **Teste rápido:** no bucket, em *Settings → Public Development URL*, ative. Você recebe um endereço `https://pub-xxxx.r2.dev`. Serve para testar, não para produção (a Cloudflare limita esse endereço).
- **Produção:** em *Settings → Custom Domains*, adicione um domínio seu (por exemplo `img.lamarketing.com.br`). O domínio precisa estar na Cloudflare (DNS gerenciado por ela).

## 4. Ligar ao servidor (na VPS)
```bash
cd ~/mailstudio/servidor
nano .env
```
Acrescente ao final (troque pelos seus valores):
```
R2_ACCOUNT_ID=seu_account_id
R2_BUCKET=mail-img
R2_ACCESS_KEY_ID=sua_access_key
R2_SECRET_ACCESS_KEY=seu_secret
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```
Salve (Ctrl+O, Enter, Ctrl+X) e reinicie:
```bash
docker compose up -d
```

## 5. Testar
No editor, envie uma imagem. O campo "URL da imagem" deve mostrar `https://.../i/xxxxxxxx.jpg`, e o endereço deve abrir no navegador.

Se o envio falhar com "Não foi possível salvar a imagem no armazenamento (R2). Código ...":
- 403: chave, segredo ou Account ID errados, ou o token não tem permissão no bucket.
- 404: nome do bucket errado.
Veja também `docker logs mailstudio-gif --tail 20`.

Para voltar a guardar na VPS, apague as linhas R2_* do `.env` e rode `docker compose up -d`.
