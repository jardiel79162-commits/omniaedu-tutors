export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_settings: {
        Row: {
          auto_reply_enabled: boolean
          groq_api_key: string | null
          model: string
          system_prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_reply_enabled?: boolean
          groq_api_key?: string | null
          model?: string
          system_prompt?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_reply_enabled?: boolean
          groq_api_key?: string | null
          model?: string
          system_prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_tracks: {
        Row: {
          artist: string | null
          created_at: string
          duration_ms: number | null
          id: string
          title: string
          uploader_id: string | null
          url: string
          uses_count: number
        }
        Insert: {
          artist?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          title: string
          uploader_id?: string | null
          url: string
          uses_count?: number
        }
        Update: {
          artist?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          title?: string
          uploader_id?: string | null
          url?: string
          uses_count?: number
        }
        Relationships: []
      }
      automations: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          reply: string
          trigger_type: string
          trigger_value: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          reply: string
          trigger_type?: string
          trigger_value: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          reply?: string
          trigger_type?: string
          trigger_value?: string
          user_id?: string
        }
        Relationships: []
      }
      call_events: {
        Row: {
          answer: Json | null
          caller_ice: Json
          caller_id: string
          chat_id: string
          created_at: string
          expires_at: string
          id: string
          mode: string
          offer: Json
          recipient_ice: Json
          recipient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          answer?: Json | null
          caller_ice?: Json
          caller_id: string
          chat_id: string
          created_at?: string
          expires_at?: string
          id?: string
          mode: string
          offer: Json
          recipient_ice?: Json
          recipient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: Json | null
          caller_ice?: Json
          caller_id?: string
          chat_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          mode?: string
          offer?: Json
          recipient_ice?: Json
          recipient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_members: {
        Row: {
          chat_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          duration_ms: number | null
          id: string
          media_url: string | null
          message_type: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          chat_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          created_by: string
          id: string
          last_message: string | null
          last_message_at: string | null
          name: string | null
          type: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          type: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          type?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          is_private: boolean
          name: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_private?: boolean
          name: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_private?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_nicknames: {
        Row: {
          contact_id: string
          created_at: string
          nickname: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          nickname: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          nickname?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          jid: string
          name: string | null
          notes: string | null
          phone: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          jid: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          jid?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_requests: {
        Row: {
          created_at: string
          from_id: string
          id: string
          message: string
          status: string
          to_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          message?: string
          status?: string
          to_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          message?: string
          status?: string
          to_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ai_enabled: boolean
          contact_id: string | null
          created_at: string
          id: string
          jid: string
          last_message: string | null
          last_message_at: string | null
          unread_count: number
          user_id: string
        }
        Insert: {
          ai_enabled?: boolean
          contact_id?: string | null
          created_at?: string
          id?: string
          jid: string
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number
          user_id: string
        }
        Update: {
          ai_enabled?: boolean
          contact_id?: string | null
          created_at?: string
          id?: string
          jid?: string
          last_message?: string | null
          last_message_at?: string | null
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_rewards: {
        Row: {
          achieved_at: string
          id: string
          tier: number
          user_id: string
        }
        Insert: {
          achieved_at?: string
          id?: string
          tier: number
          user_id: string
        }
        Update: {
          achieved_at?: string
          id?: string
          tier?: number
          user_id?: string
        }
        Relationships: []
      }
      evolution_settings: {
        Row: {
          api_key: string | null
          base_url: string | null
          connection_status: string | null
          instance_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          connection_status?: string | null
          instance_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          connection_status?: string | null
          instance_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      hashtags: {
        Row: {
          created_at: string
          tag: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          tag: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          tag?: string
          uses_count?: number
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          external_id: string | null
          id: string
          is_ai: boolean
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          external_id?: string | null
          id?: string
          is_ai?: boolean
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          external_id?: string | null
          id?: string
          is_ai?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          read_at: string | null
          target_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          target_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          target_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          free_value: Json | null
          id: string
          key: string
          label: string
          plus_value: Json | null
          sort_order: number
          unit: string | null
          updated_at: string
          value_type: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          free_value?: Json | null
          id?: string
          key: string
          label: string
          plus_value?: Json | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
          value_type?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          free_value?: Json | null
          id?: string
          key?: string
          label?: string
          plus_value?: Json | null
          sort_order?: number
          unit?: string | null
          updated_at?: string
          value_type?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_hashtags: {
        Row: {
          post_id: string
          tag: string
        }
        Insert: {
          post_id: string
          tag: string
        }
        Update: {
          post_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_links: {
        Row: {
          created_at: string
          id: string
          label: string | null
          logo_url: string | null
          media_position: number
          post_id: string
          size: number
          url: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          logo_url?: string | null
          media_position?: number
          post_id: string
          size?: number
          url: string
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          logo_url?: string | null
          media_position?: number
          post_id?: string
          size?: number
          url?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_links_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          duration_ms: number | null
          height: number | null
          id: string
          mime: string
          position: number
          post_id: string
          url: string
          width: number | null
        }
        Insert: {
          duration_ms?: number | null
          height?: number | null
          id?: string
          mime: string
          position?: number
          post_id: string
          url: string
          width?: number | null
        }
        Update: {
          duration_ms?: number | null
          height?: number | null
          id?: string
          mime?: string
          position?: number
          post_id?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          collection_id: string | null
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          audio_track_id: string | null
          author_id: string
          caption: string
          comments_count: number
          created_at: string
          id: string
          kind: string
          likes_count: number
          visibility: string
        }
        Insert: {
          audio_track_id?: string | null
          author_id: string
          caption?: string
          comments_count?: number
          created_at?: string
          id?: string
          kind?: string
          likes_count?: number
          visibility?: string
        }
        Update: {
          audio_track_id?: string | null
          author_id?: string
          caption?: string
          comments_count?: number
          created_at?: string
          id?: string
          kind?: string
          likes_count?: number
          visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          created_at: string
          followers_count: number
          following_count: number
          full_name: string | null
          hide_followers: boolean
          hide_following: boolean
          id: string
          is_plus: boolean
          plus_settings: Json
          posts_count: number
          short_code: string | null
          username: string | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          created_at?: string
          followers_count?: number
          following_count?: number
          full_name?: string | null
          hide_followers?: boolean
          hide_following?: boolean
          id: string
          is_plus?: boolean
          plus_settings?: Json
          posts_count?: number
          short_code?: string | null
          username?: string | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          created_at?: string
          followers_count?: number
          following_count?: number
          full_name?: string | null
          hide_followers?: boolean
          hide_following?: boolean
          id?: string
          is_plus?: boolean
          plus_settings?: Json
          posts_count?: number
          short_code?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
          target_user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
          target_user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
          target_user_id?: string
        }
        Relationships: []
      }
      reserved_usernames: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          updated_at: string
          user_id: string
          username: string
          username_lower: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username: string
          username_lower?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
          username_lower?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip: string | null
          message: string | null
          metadata: Json
          risk_score: number
          route: string | null
          severity: Database["public"]["Enums"]["security_severity"]
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip?: string | null
          message?: string | null
          metadata?: Json
          risk_score?: number
          route?: string | null
          severity?: Database["public"]["Enums"]["security_severity"]
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip?: string | null
          message?: string | null
          metadata?: Json
          risk_score?: number
          route?: string | null
          severity?: Database["public"]["Enums"]["security_severity"]
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      status_views: {
        Row: {
          status_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          status_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          status_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: []
      }
      statuses: {
        Row: {
          background: string | null
          content: string | null
          created_at: string
          expires_at: string
          id: string
          media_url: string | null
          user_id: string
        }
        Insert: {
          background?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          user_id: string
        }
        Update: {
          background?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          plan: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          plan?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_moderation: {
        Row: {
          banned: boolean
          banned_at: string | null
          banned_by: string | null
          banned_reason: string | null
          reports_count: number
          supervision_since: string | null
          under_supervision: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          banned?: boolean
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          reports_count?: number
          supervision_since?: string | null
          under_supervision?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          banned?: boolean
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          reports_count?: number
          supervision_since?: string | null
          under_supervision?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      any_admin_exists: { Args: never; Returns: boolean }
      append_call_ice: {
        Args: { _candidate: Json; _event_id: string; _side: string }
        Returns: undefined
      }
      can_view_followers: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      can_view_following: {
        Args: { _owner: string; _viewer: string }
        Returns: boolean
      }
      ensure_direct_chat: {
        Args: { _addressee_id: string; _requester_id: string }
        Returns: string
      }
      generate_unique_short_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_admin: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_chat_member: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_plus_user: { Args: { _user_id: string }; Returns: boolean }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      is_username_available: {
        Args: { _for_user?: string; _username: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          _event_type: string
          _ip?: string
          _message?: string
          _metadata?: Json
          _risk_score?: number
          _route?: string
          _severity?: Database["public"]["Enums"]["security_severity"]
          _user_agent?: string
        }
        Returns: string
      }
      release_username_reservation: {
        Args: { _id: string }
        Returns: undefined
      }
      reserve_username: { Args: { _username: string }; Returns: string }
      shares_chat_with: { Args: { _a: string; _b: string }; Returns: boolean }
      sync_profile_is_plus: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      friendship_status: "pending" | "accepted" | "rejected"
      report_reason:
        | "spam_golpe"
        | "assedio_bullying"
        | "nudez"
        | "odio_violencia"
        | "automutilacao"
        | "outro"
      report_status: "pending" | "reviewed" | "dismissed" | "actioned"
      report_target_type: "profile" | "post" | "message" | "comment"
      security_severity: "info" | "low" | "medium" | "high" | "critical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      friendship_status: ["pending", "accepted", "rejected"],
      report_reason: [
        "spam_golpe",
        "assedio_bullying",
        "nudez",
        "odio_violencia",
        "automutilacao",
        "outro",
      ],
      report_status: ["pending", "reviewed", "dismissed", "actioned"],
      report_target_type: ["profile", "post", "message", "comment"],
      security_severity: ["info", "low", "medium", "high", "critical"],
    },
  },
} as const
