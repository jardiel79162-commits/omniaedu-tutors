
# Expansão para Rede Social (Instagram/TikTok + WhatsApp)

Vou transformar o JTC Interlink numa plataforma social completa, mantendo todo o sistema atual de chat, chamadas, status e grupos.

## Regras de produto (com base nas suas respostas)

- **Perfis e posts públicos por padrão** (qualquer um vê, igual TikTok)
- **Seguir é livre** — não precisa aceitação
- **Conversar exige pedido**: para abrir chat com alguém que você só segue, é preciso enviar um "pedido de conversa". A outra pessoa aceita ou recusa. Só após aceitar é que o chat direto é criado.
- O sistema atual de "amizades" será **substituído por "pedidos de conversa"** (mesma tabela, novo significado/UX). Seguir é separado.

## Funcionalidades novas

### 1. Seguir / Seguidores
- Botão "Seguir / Seguindo" em qualquer perfil
- Contadores: seguidores, seguindo, posts
- Lista de seguidores e seguindo no perfil

### 2. Feed principal (`/feed`) — nova rota inicial
- Posts de quem você segue + sugestões públicas misturadas
- Cada post: autor, mídia (foto ou vídeo), legenda, curtidas, comentários, hashtags, tempo
- Carrosséis (múltiplas mídias por post)
- Curtir, comentar, compartilhar (link interno), salvar

### 3. Reels (`/reels`) — feed vertical de vídeos
- Scroll vertical full-screen, autoplay, mute por padrão
- Curtir, comentar, seguir direto do reel
- Mesma tabela de posts, filtrado por tipo "reel"

### 4. Descobrir (`/explore`)
- Grade de posts populares públicos
- Busca por hashtag e por usuário
- Trending hashtags

### 5. Criar post (`/create`)
- Upload de imagem(s) ou vídeo, legenda, hashtags
- Escolha: post normal ou reel (vídeo vertical)

### 6. Notificações (`/notifications`)
- Novo seguidor, curtida, comentário, menção, pedido de conversa
- Badge no menu

### 7. Pedido de conversa (substitui amizade)
- No perfil de alguém: botão "Enviar pedido de conversa"
- Aba "Pedidos" dentro de Conversas
- Aceitar cria o chat direto; recusar descarta

### 8. Perfil expandido (`/u/$username`)
- Header: avatar, nome, @, bio, contadores, botão Seguir + botão Pedir conversa
- Grade de posts do usuário
- Aba de reels do usuário

## Navegação reorganizada

Barra inferior (5 itens): **Feed · Reels · Criar (+) · Conversas · Perfil**
Itens secundários (busca/descobrir, status, grupos, notificações) ficam no topo do Feed e dentro do Perfil.

## Modelo de dados (resumo)

Novas tabelas no Cloud:
- `follows` (follower_id, following_id) — quem segue quem
- `posts` (id, author_id, kind: photo|reel, caption, created_at)
- `post_media` (post_id, url, mime, position) — múltiplas mídias por post
- `post_likes` (post_id, user_id)
- `post_comments` (id, post_id, user_id, content, created_at)
- `hashtags` + `post_hashtags`
- `notifications` (user_id, type, actor_id, target_id, read_at)
- `conversation_requests` (from_id, to_id, status) — substitui o fluxo atual de amizade para abrir chat

Novo bucket de storage: `posts-media` (público para leitura, escrita só do dono).
RLS em todas as tabelas; posts públicos legíveis por todos autenticados.

## Implementação (faseada, num único ciclo de trabalho)

1. **Migration**: tabelas, RLS, GRANTs, bucket, índices, triggers de contagem
2. **Camada de seguir**: hooks/server fns + botão Seguir reutilizável
3. **Criar post**: upload + formulário + escolha foto/reel
4. **Feed**: rota `/feed` com infinite scroll, card de post, like/comment inline
5. **Reels**: rota `/reels` vertical full-screen
6. **Descobrir + busca por hashtag**
7. **Perfil público** `/u/$username` com grade + contadores + Seguir + Pedir conversa
8. **Pedidos de conversa**: substitui fluxo atual; nova aba em `/chats`
9. **Notificações** com realtime
10. **Nova navegação** (bottom nav + rail desktop)

## Detalhes técnicos

- Mídia de vídeo usa o `<video>` nativo (já corrigimos isso — sem player do Google)
- Realtime do Supabase para feed (novos posts/likes/comments) e notificações
- Paginação por cursor (`created_at + id`) para feed e reels
- Contadores (likes/comments/followers) mantidos por trigger para performance
- Hashtags extraídas da legenda no servidor

## O que NÃO muda

- Chat 1-a-1, grupos, chamadas de voz/vídeo, status (24h), Plus — tudo continua funcionando igual.
- Tema visual e identidade JTC mantidos; só adicionamos componentes novos.

---

⚠️ É uma expansão grande — vou entregar tudo, mas em uma sequência de migrações + commits dentro deste ciclo. Posso começar?
