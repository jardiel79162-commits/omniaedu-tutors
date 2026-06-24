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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      call_events: {
        Row: {
          callee_id: string | null
          caller_id: string
          chat_id: string
          created_at: string
          ended_at: string | null
          id: string
          kind: string
          started_at: string | null
          status: string
        }
        Insert: {
          callee_id?: string | null
          caller_id: string
          chat_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          kind?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          callee_id?: string | null
          caller_id?: string
          chat_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          kind?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_events_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
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
          content: string | null
          created_at: string
          duration_ms: number | null
          id: string
          media_url: string | null
          message_type: string
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
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
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
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
        Relationships: [
          {
            foreignKeyName: "chat_reads_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          created_by: string | null
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
          created_by?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          name?: string | null
          type?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          created_by?: string | null
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
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_nicknames: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          nickname: string
          owner_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          nickname: string
          owner_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          nickname?: string
          owner_id?: string
        }
        Relationships: []
      }
      conversation_requests: {
        Row: {
          created_at: string
          from_id: string
          id: string
          message: string | null
          status: string
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          message?: string | null
          status?: string
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          message?: string | null
          status?: string
          to_id?: string
        }
        Relationships: []
      }
      creator_rewards: {
        Row: {
          granted_at: string
          id: string
          tier: number
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          tier: number
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          tier?: number
          user_id?: string
        }
        Relationships: []
      }
      diagnostic_results: {
        Row: {
          answers: Json
          assessed_level: number
          created_at: string
          id: string
          subject: string
          user_id: string
        }
        Insert: {
          answers?: Json
          assessed_level?: number
          created_at?: string
          id?: string
          subject: string
          user_id: string
        }
        Update: {
          answers?: Json
          assessed_level?: number
          created_at?: string
          id?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hashtags: {
        Row: {
          tag: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          tag: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          tag?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          payload: Json
          read: boolean
          read_at: string | null
          target_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          read_at?: string | null
          target_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          read_at?: string | null
          target_id?: string | null
          type?: string
          user_id?: string
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
          created_at: string
          id: string
          post_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
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
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      post_media: {
        Row: {
          created_at: string
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
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          mime?: string
          position?: number
          post_id: string
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
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
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          caption: string | null
          comments_count: number
          created_at: string
          id: string
          kind: string
          likes_count: number
          location: string | null
          media_type: string | null
          media_url: string | null
          visibility: string
        }
        Insert: {
          author_id: string
          caption?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          kind?: string
          likes_count?: number
          location?: string | null
          media_type?: string | null
          media_url?: string | null
          visibility?: string
        }
        Update: {
          author_id?: string
          caption?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          kind?: string
          likes_count?: number
          location?: string | null
          media_type?: string | null
          media_url?: string | null
          visibility?: string
        }
        Relationships: []
      }
      product_links: {
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
            foreignKeyName: "product_links_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          followers_count: number
          following_count: number
          full_name: string | null
          id: string
          is_plus: boolean
          plus_settings: Json
          posts_count: number
          short_code: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          followers_count?: number
          following_count?: number
          full_name?: string | null
          id: string
          is_plus?: boolean
          plus_settings?: Json
          posts_count?: number
          short_code?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          followers_count?: number
          following_count?: number
          full_name?: string | null
          id?: string
          is_plus?: boolean
          plus_settings?: Json
          posts_count?: number
          short_code?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          created_at: string
          id: string
          narrative: string
          subject: string
          teacher_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          narrative: string
          subject: string
          teacher_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          narrative?: string
          subject?: string
          teacher_name?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string | null
          target_type: string
          target_user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string | null
          target_type: string
          target_user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string | null
          target_type?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      reserved_usernames: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          user_id?: string
          username?: string
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
          severity: string
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
          severity?: string
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
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      status_views: {
        Row: {
          created_at: string
          id: string
          status_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_views_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          background: string | null
          caption: string | null
          content: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string | null
          media_url: string | null
          user_id: string
        }
        Insert: {
          background?: string | null
          caption?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id: string
        }
        Update: {
          background?: string | null
          caption?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          age_group: string
          calligraphy_level: number
          created_at: string
          display_name: string
          id: string
          math_level: number
          onboarding_completed: boolean
          reading_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          age_group?: string
          calligraphy_level?: number
          created_at?: string
          display_name?: string
          id?: string
          math_level?: number
          onboarding_completed?: boolean
          reading_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          age_group?: string
          calligraphy_level?: number
          created_at?: string
          display_name?: string
          id?: string
          math_level?: number
          onboarding_completed?: boolean
          reading_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          mp_payment_id: string | null
          plan: string
          provider: string | null
          provider_ref: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          mp_payment_id?: string | null
          plan?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          mp_payment_id?: string | null
          plan?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_attempts: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_correct: boolean | null
          task_id: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          task_id: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attempts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          content: Json
          created_at: string
          difficulty: number
          id: string
          instruction: string
          status: string
          subject: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content?: Json
          created_at?: string
          difficulty?: number
          id?: string
          instruction: string
          status?: string
          subject: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content?: Json
          created_at?: string
          difficulty?: number
          id?: string
          instruction?: string
          status?: string
          subject?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_feedback: {
        Row: {
          attempt_id: string | null
          created_at: string
          feedback_text: string
          feedback_type: string
          id: string
          subject: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          feedback_text: string
          feedback_type?: string
          id?: string
          subject: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          feedback_text?: string
          feedback_type?: string
          id?: string
          subject?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_feedback_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "task_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_feedback_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_moderation: {
        Row: {
          banned: boolean
          banned_at: string | null
          banned_by: string | null
          banned_reason: string | null
          reports_count: number
          supervised_at: string | null
          supervised_by: string | null
          supervised_until: string | null
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
          supervised_at?: string | null
          supervised_by?: string | null
          supervised_until?: string | null
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
          supervised_at?: string | null
          supervised_by?: string | null
          supervised_until?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_member: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
      is_username_available: {
        Args: { _for_user: string; _username: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          _event_type: string
          _message?: string
          _metadata?: Json
          _risk_score?: number
          _route?: string
          _severity?: string
          _user_agent?: string
        }
        Returns: undefined
      }
      release_username_reservation: {
        Args: { _id: string }
        Returns: undefined
      }
      reserve_username: { Args: { _username: string }; Returns: string }
      sync_profile_is_plus: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
