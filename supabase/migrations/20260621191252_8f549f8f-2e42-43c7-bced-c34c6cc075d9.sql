
CREATE TABLE public.plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  category text NOT NULL,
  label text NOT NULL,
  description text,
  value_type text NOT NULL DEFAULT 'number' CHECK (value_type IN ('number','boolean','text','unlimited')),
  free_value jsonb,
  plus_value jsonb,
  unit text,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_limits TO authenticated, anon;
GRANT ALL ON public.plan_limits TO service_role;

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_limits readable by everyone"
  ON public.plan_limits FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "plan_limits admin write"
  ON public.plan_limits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_plan_limits_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER plan_limits_updated_at
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.tg_plan_limits_updated_at();

-- Seed
INSERT INTO public.plan_limits (key, category, label, description, value_type, free_value, plus_value, unit, sort_order) VALUES
-- Perfil
('profile_usernames', 'Perfil', 'Usernames', 'Quantidade de @ permitidos', 'number', '1'::jsonb, '1'::jsonb, null, 10),
('profile_avatar', 'Perfil', 'Foto de perfil', 'Avatar do usuário', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 20),
('profile_banner', 'Perfil', 'Banner', 'Banner de perfil', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 30),
('profile_banner_animated', 'Perfil', 'Banner animado', 'Banner em vídeo/GIF', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 35),
('profile_avatar_hd', 'Perfil', 'Avatar em HD', 'Upload do avatar em alta resolução', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 36),
('profile_avatar_animated', 'Perfil', 'Avatar animado', 'Avatar em vídeo/GIF', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 37),
('profile_bio_chars', 'Perfil', 'Biografia', 'Caracteres máximos na bio', 'number', '300'::jsonb, '1000'::jsonb, 'caracteres', 40),
('profile_links', 'Perfil', 'Links no perfil', 'Quantidade de links externos', 'number', '5'::jsonb, '20'::jsonb, null, 50),
('profile_verified_badge', 'Perfil', 'Selo verificado azul', 'Selo de verificação', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 60),
('profile_animated_badge', 'Perfil', 'Selo animado', 'Animação no selo', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 65),
('profile_colored_name', 'Perfil', 'Nome colorido', 'Cor exclusiva no nome', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 70),
('profile_frames', 'Perfil', 'Molduras exclusivas', 'Molduras no avatar', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 75),
('profile_featured', 'Perfil', 'Perfil em destaque', 'Aparece em destaque na busca', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 80),
('profile_no_ads', 'Perfil', 'Perfil sem anúncios', 'Remove anúncios do perfil', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 85),
('profile_reserved_usernames', 'Perfil', 'Usernames reservados', 'Até X @ exclusivos bloqueados para outros', 'number', '0'::jsonb, '3'::jsonb, null, 90),

-- Arquivos
('file_max_size_mb', 'Arquivos', 'Tamanho máx. por arquivo', 'Tamanho máximo de cada arquivo enviado', 'number', '2048'::jsonb, '10240'::jsonb, 'MB', 100),
('storage_total', 'Arquivos', 'Armazenamento total', 'Ilimitado para ambos', 'unlimited', '"ilimitado"'::jsonb, '"ilimitado"'::jsonb, null, 110),
('photos_unlimited', 'Arquivos', 'Fotos ilimitadas', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 120),
('videos_unlimited', 'Arquivos', 'Vídeos ilimitados', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 130),
('docs_unlimited', 'Arquivos', 'Documentos ilimitados', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 140),
('media_per_post', 'Arquivos', 'Mídias por publicação', 'Quantidade de fotos/vídeos por post', 'number', '10'::jsonb, '30'::jsonb, null, 150),
('backup_days', 'Arquivos', 'Backup', 'Dias de retenção do backup (0 = permanente)', 'number', '30'::jsonb, '0'::jsonb, 'dias', 160),
('restore_deleted', 'Arquivos', 'Restaurar arquivos apagados', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 170),
('instant_share', 'Arquivos', 'Compartilhamento instantâneo', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 180),

-- Publicações
('posts_per_day', 'Publicações', 'Publicações por dia', '', 'number', '30'::jsonb, '-1'::jsonb, null, 200),
('stories_per_day', 'Publicações', 'Stories por dia', '', 'number', '40'::jsonb, '-1'::jsonb, null, 210),
('scheduled_posts', 'Publicações', 'Publicações agendadas', '', 'number', '5'::jsonb, '-1'::jsonb, null, 220),
('video_max_minutes', 'Publicações', 'Duração máx. de vídeo', '', 'number', '10'::jsonb, '240'::jsonb, 'min', 230),
('download_stories', 'Publicações', 'Download de stories', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 240),
('custom_thumbnails', 'Publicações', 'Miniaturas personalizadas', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 250),
('unlimited_highlights', 'Publicações', 'Destaques ilimitados', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 260),

-- Grupos
('group_members', 'Grupos', 'Participantes por grupo', '', 'number', '500'::jsonb, '2000'::jsonb, null, 300),
('groups_created', 'Grupos', 'Grupos criados', '', 'number', '5'::jsonb, '-1'::jsonb, null, 310),
('group_admins', 'Grupos', 'Administradores por grupo', '', 'number', '3'::jsonb, '20'::jsonb, null, 320),
('group_polls', 'Grupos', 'Enquetes', 'Simples no Free, avançadas no Plus', 'text', '"simples"'::jsonb, '"avançadas"'::jsonb, null, 330),
('group_pinned', 'Grupos', 'Mensagens fixadas', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 340),
('group_subgroups', 'Grupos', 'Subgrupos', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 350),
('group_channels', 'Grupos', 'Canais privados', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 360),
('group_events', 'Grupos', 'Eventos', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 370),
('group_stats', 'Grupos', 'Estatísticas completas', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 380),
('group_custom_roles', 'Grupos', 'Cargos personalizados', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 390),

-- Conversas
('voice_calls', 'Conversas', 'Chamadas de voz', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 400),
('video_calls', 'Conversas', 'Chamadas de vídeo', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 410),
('reactions', 'Conversas', 'Reações', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 420),
('reply_messages', 'Conversas', 'Responder mensagens', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 430),
('edit_minutes', 'Conversas', 'Editar mensagens', 'Minutos após envio', 'number', '15'::jsonb, '1440'::jsonb, 'min', 440),
('delete_hours', 'Conversas', 'Apagar para todos', 'Horas após envio', 'number', '2'::jsonb, '168'::jsonb, 'h', 450),
('pinned_chats', 'Conversas', 'Conversas fixadas', '', 'number', '5'::jsonb, '100'::jsonb, null, 460),
('auto_translator', 'Conversas', 'Tradutor automático', 'Em breve', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 470),
('scheduled_messages', 'Conversas', 'Mensagens programadas', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 480),
('secret_mode', 'Conversas', 'Modo secreto', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 490),
('password_chat', 'Conversas', 'Proteção por senha', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 500),

-- IA (Em breve)
('ai_assistant', 'Inteligência Artificial', 'Assistente IA', 'Em breve', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 600),
('ai_captions', 'Inteligência Artificial', 'Sugestão de legendas', 'Em breve', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 610),
('ai_hashtags', 'Inteligência Artificial', 'Sugestão de hashtags', 'Em breve', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 620),
('ai_summary', 'Inteligência Artificial', 'Resumo automático', 'Em breve', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 630),
('ai_spellcheck', 'Inteligência Artificial', 'Correção ortográfica', 'Em breve', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 640),
('ai_smart_replies', 'Inteligência Artificial', 'Respostas inteligentes', 'Em breve', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 650),

-- Personalização
('themes_premium', 'Personalização', 'Temas premium', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 700),
('fonts_premium', 'Personalização', 'Fontes exclusivas', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 710),
('gradients_premium', 'Personalização', 'Gradientes exclusivos', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 720),
('story_ring_gold', 'Personalização', 'Anel dourado nos stories', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 730),
('sounds_custom', 'Personalização', 'Sons personalizados', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 740),
('ui_custom', 'Personalização', 'Interface personalizada', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 750),

-- Segurança
('two_factor', 'Segurança', 'Verificação em duas etapas', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 800),
('login_alerts', 'Segurança', 'Alertas de login', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 810),
('active_sessions', 'Segurança', 'Sessões ativas', '', 'boolean', 'true'::jsonb, 'true'::jsonb, null, 820),
('basic_privacy', 'Segurança', 'Controle de privacidade', '', 'text', '"básico"'::jsonb, '"avançado"'::jsonb, null, 830),
('biometrics', 'Segurança', 'Biometria', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 840),
('pin_lock', 'Segurança', 'PIN', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 850),
('anti_spam', 'Segurança', 'Anti-spam', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 860),
('anti_bot', 'Segurança', 'Anti-bot', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 870),
('anti_fake', 'Segurança', 'Anti-fake', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 880),
('advanced_protection', 'Segurança', 'Proteção avançada da conta', '', 'boolean', 'false'::jsonb, 'true'::jsonb, null, 890);
