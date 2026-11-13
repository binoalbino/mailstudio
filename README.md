# Mail Studio
Editor de e-mail marketing com cronômetro em GIF (LA Marketing).

- Raiz: o editor (publicado no GitHub Pages).
- `servidor/`: servidor PHP em Docker (GIF dinâmico do cronômetro e upload de imagens). Veja `servidor/instalar.sh`.

## Compartilhar prévia com o cliente
No editor, o botão **🔗 Compartilhar** cria um link privado (`.../api/ver.php?t=...`) com a prévia do e-mail, em versão computador/celular, sem exigir conta. O cronômetro mostra o tempo real restante.
- Mesmo e-mail = mesmo link. "Atualizar com a versão atual" troca o conteúdo sem mudar o endereço.
- Validade escolhida na hora (7, 15, 30 ou 90 dias). "Desativar link" derruba o acesso na hora.
- Mostra quantas vezes o link foi aberto (robôs e a pré-visualização do WhatsApp não contam).
- O link não é indexado pelo Google e o e-mail roda isolado (sem scripts). Quem tem o link consegue ver; não compartilhe em locais públicos.
- Atualização do servidor: `git pull` e `docker compose up -d --build` (arquivos novos: `servidor/api/share.php` e `servidor/api/ver.php`).
