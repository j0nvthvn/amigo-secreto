
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "assignments": {
                  Row: {
                    "giver_member_id": string,"group_id": string,"id": string,"receiver_member_id": string
                  }
                  Insert: {
                    "giver_member_id": string,"group_id": string,"id"?: string,"receiver_member_id": string
                  }
                  Update: {
                    "giver_member_id"?: string,"group_id"?: string,"id"?: string,"receiver_member_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_group_id_giver_member_id_fkey"
      columns: ["group_id","giver_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["group_id","id"]
    },{
      foreignKeyName: "assignments_group_id_receiver_member_id_fkey"
      columns: ["group_id","receiver_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["group_id","id"]
    }
                  ]
                },"exclusions": {
                  Row: {
                    "giver_member_id": string,"group_id": string,"receiver_member_id": string
                  }
                  Insert: {
                    "giver_member_id": string,"group_id": string,"receiver_member_id": string
                  }
                  Update: {
                    "giver_member_id"?: string,"group_id"?: string,"receiver_member_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exclusions_group_id_giver_member_id_fkey"
      columns: ["group_id","giver_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["group_id","id"]
    },{
      foreignKeyName: "exclusions_group_id_receiver_member_id_fkey"
      columns: ["group_id","receiver_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["group_id","id"]
    }
                  ]
                },"group_events": {
                  Row: {
                    "created_at": string,"group_id": string,"id": number,"kind": Database["public"]['Enums']["group_event_kind"],"member_id": string | null,"member_name": string | null,"target_user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"group_id": string,"id"?: never,"kind": Database["public"]['Enums']["group_event_kind"],"member_id"?: string | null,"member_name"?: string | null,"target_user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"id"?: never,"kind"?: Database["public"]['Enums']["group_event_kind"],"member_id"?: string | null,"member_name"?: string | null,"target_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_events_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_events_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "avoid_mutual": boolean,"budget_amount": number | null,"created_at": string,"currency": string,"drawn_at": string | null,"event_date": string,"id": string,"name": string,"owner_id": string,"place": string | null,"single_cycle": boolean,"status": Database["public"]['Enums']["group_status"],"timezone": string
                  }
                  Insert: {
                    "avoid_mutual"?: boolean,"budget_amount"?: number | null,"created_at"?: string,"currency"?: string,"drawn_at"?: string | null,"event_date": string,"id"?: string,"name": string,"owner_id": string,"place"?: string | null,"single_cycle"?: boolean,"status"?: Database["public"]['Enums']["group_status"],"timezone"?: string
                  }
                  Update: {
                    "avoid_mutual"?: boolean,"budget_amount"?: number | null,"created_at"?: string,"currency"?: string,"drawn_at"?: string | null,"event_date"?: string,"id"?: string,"name"?: string,"owner_id"?: string,"place"?: string | null,"single_cycle"?: boolean,"status"?: Database["public"]['Enums']["group_status"],"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"member_invites": {
                  Row: {
                    "created_at": string,"member_id": string,"token": string
                  }
                  Insert: {
                    "created_at"?: string,"member_id": string,"token": string
                  }
                  Update: {
                    "created_at"?: string,"member_id"?: string,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_invites_member_id_fkey"
      columns: ["member_id"]
isOneToOne: true
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "claimed_at": string | null,"created_at": string,"display_name": string,"group_id": string,"id": string,"result_viewed_at": string | null,"user_id": string | null
                  }
                  Insert: {
                    "claimed_at"?: string | null,"created_at"?: string,"display_name": string,"group_id": string,"id"?: string,"result_viewed_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "claimed_at"?: string | null,"created_at"?: string,"display_name"?: string,"group_id"?: string,"id"?: string,"result_viewed_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "assignment_id": string,"body": string,"created_at": string,"direction": Database["public"]['Enums']["msg_direction"],"id": string
                  }
                  Insert: {
                    "assignment_id": string,"body": string,"created_at"?: string,"direction": Database["public"]['Enums']["msg_direction"],"id"?: string
                  }
                  Update: {
                    "assignment_id"?: string,"body"?: string,"created_at"?: string,"direction"?: Database["public"]['Enums']["msg_direction"],"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "assignments"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth_key": string | null,"created_at": string,"id": string,"kind": Database["public"]['Enums']["push_kind"],"p256dh": string | null,"token": string,"user_id": string
                  }
                  Insert: {
                    "auth_key"?: string | null,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["push_kind"],"p256dh"?: string | null,"token": string,"user_id": string
                  }
                  Update: {
                    "auth_key"?: string | null,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["push_kind"],"p256dh"?: string | null,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reminders_sent": {
                  Row: {
                    "group_id": string,"kind": string,"sent_at": string
                  }
                  Insert: {
                    "group_id": string,"kind": string,"sent_at"?: string
                  }
                  Update: {
                    "group_id"?: string,"kind"?: string,"sent_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminders_sent_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"group_id": string,"id": string,"message_body": string,"message_id": string | null,"reason": string | null,"reporter_member_id": string,"status": Database["public"]['Enums']["report_status"]
                  }
                  Insert: {
                    "created_at"?: string,"group_id": string,"id"?: string,"message_body": string,"message_id"?: string | null,"reason"?: string | null,"reporter_member_id": string,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"id"?: string,"message_body"?: string,"message_id"?: string | null,"reason"?: string | null,"reporter_member_id"?: string,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_member_id_fkey"
      columns: ["reporter_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"thread_state": {
                  Row: {
                    "last_read_at": string,"member_id": string,"muted": boolean,"side": Database["public"]['Enums']["thread_side"]
                  }
                  Insert: {
                    "last_read_at"?: string,"member_id": string,"muted"?: boolean,"side": Database["public"]['Enums']["thread_side"]
                  }
                  Update: {
                    "last_read_at"?: string,"member_id"?: string,"muted"?: boolean,"side"?: Database["public"]['Enums']["thread_side"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "thread_state_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlist_items": {
                  Row: {
                    "created_at": string,"id": string,"member_id": string,"position": number,"text": string,"url": string | null
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"member_id": string,"position"?: number,"text": string,"url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"member_id"?: string,"position"?: number,"text"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlist_items_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_is_anonymous":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"_lock_owned_group":
{ Args: { "p_group_id": string,"p_uid": string }; Returns: {
              "avoid_mutual": boolean,
"budget_amount": number | null,
"created_at": string,
"currency": string,
"drawn_at": string | null,
"event_date": string,
"id": string,
"name": string,
"owner_id": string,
"place": string | null,
"single_cycle": boolean,
"status": Database["public"]['Enums']["group_status"],
"timezone": string
            }
                          SetofOptions: {
        from: "*"
        to: "groups"
        isOneToOne: true
        isSetofReturn: false
      } },
"_lock_owned_member":
{ Args: { "p_member_id": string,"p_uid": string }; Returns: {
              "claimed_at": string | null,
"created_at": string,
"display_name": string,
"group_id": string,
"id": string,
"result_viewed_at": string | null,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "members"
        isOneToOne: true
        isSetofReturn: false
      } },
"_log_event":
{ Args: { "p_group_id": string,"p_kind": Database["public"]['Enums']["group_event_kind"],"p_member_id"?: string,"p_member_name"?: string,"p_target_user_id"?: string }; Returns: undefined
                           },
"_member_name_taken":
{ Args: { "p_display_name": string,"p_except"?: string,"p_group_id": string }; Returns: boolean
                           },
"_muted":
{ Args: { "p_member_id": string,"p_side": Database["public"]['Enums']["thread_side"] }; Returns: boolean
                           },
"_new_invite_token":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_parse_pairs":
{ Args: { "p_group_id": string,"p_pairs": Json }; Returns: {
              "giver": string,"receiver": string
            }[]
                           },
"_raise":
{ Args: { "p_code": string }; Returns: undefined
                           },
"_today_in":
{ Args: { "p_timezone": string }; Returns: string
                           },
"_uid":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_unread":
{ Args: { "p_member_id": string,"p_side": Database["public"]['Enums']["thread_side"] }; Returns: number
                           },
"_valid_group_fields":
{ Args: { "p_budget_amount": number,"p_currency": string,"p_name": string,"p_place": string }; Returns: boolean
                           },
"_valid_member_name":
{ Args: { "p_display_name": string }; Returns: boolean
                           },
"add_member":
{ Args: { "p_display_name": string,"p_group_id": string }; Returns: Json
                           },
"commit_draw":
{ Args: { "p_group_id": string,"p_pairs": Json }; Returns: undefined
                           },
"create_group":
{ Args: { "p_budget_amount"?: number,"p_currency"?: string,"p_event_date": string,"p_name": string,"p_owner_display_name"?: string,"p_owner_participates"?: boolean,"p_place"?: string,"p_timezone"?: string }; Returns: string
                           },
"delete_group":
{ Args: { "p_group_id": string }; Returns: undefined
                           },
"get_activity":
{ Args: { "p_before_id"?: number,"p_group_id": string,"p_limit"?: number }; Returns: {
              "created_at": string,"id": number,"kind": Database["public"]['Enums']["group_event_kind"],"member_name": string
            }[]
                           },
"get_exclusions":
{ Args: { "p_group_id": string }; Returns: {
              "giver_member_id": string,"receiver_member_id": string
            }[]
                           },
"get_group":
{ Args: { "p_group_id": string }; Returns: Json
                           },
"get_invite_links":
{ Args: { "p_group_id": string }; Returns: {
              "claimed": boolean,"display_name": string,"member_id": string,"result_viewed": boolean,"token": string
            }[]
                           },
"get_my_groups":
{ Args: Record<PropertyKey, never>; Returns: {
              "archived": boolean,"event_date": string,"group_id": string,"is_owner": boolean,"name": string,"status": Database["public"]['Enums']["group_status"],"unread": number
            }[]
                           },
"is_archived":
{ Args: { "p_group_id": string }; Returns: boolean
                           },
"is_group_viewer":
{ Args: { "p_group_id": string }; Returns: boolean
                           },
"is_my_member":
{ Args: { "p_member_id": string }; Returns: boolean
                           },
"member_group":
{ Args: { "p_member_id": string }; Returns: string
                           },
"open_invite":
{ Args: { "p_token": string }; Returns: Json
                           },
"regenerate_invite":
{ Args: { "p_member_id": string }; Returns: string
                           },
"remove_member":
{ Args: { "p_member_id": string }; Returns: undefined
                           },
"rename_member":
{ Args: { "p_display_name": string,"p_member_id": string }; Returns: undefined
                           },
"reset_draw":
{ Args: { "p_group_id": string }; Returns: undefined
                           },
"reveal_result":
{ Args: { "p_group_id": string }; Returns: Json
                           },
"set_draw_options":
{ Args: { "p_avoid_mutual": boolean,"p_group_id": string,"p_single_cycle": boolean }; Returns: undefined
                           },
"set_exclusions":
{ Args: { "p_group_id": string,"p_pairs": Json }; Returns: undefined
                           },
"update_group":
{ Args: { "p_budget_amount"?: number,"p_currency"?: string,"p_event_date": string,"p_group_id": string,"p_name": string,"p_place"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "group_event_kind": "member_added"|"member_renamed"|"member_removed"|"invite_claimed"|"invite_regenerated"|"draw_done"|"draw_reset"|"result_viewed","group_status": "open"|"drawn","msg_direction": "to_receiver"|"to_giver","push_kind": "expo"|"web","report_status": "pending"|"dismissed"|"actioned","thread_side": "giving"|"receiving"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "group_event_kind": ["member_added", "member_renamed", "member_removed", "invite_claimed", "invite_regenerated", "draw_done", "draw_reset", "result_viewed"],"group_status": ["open", "drawn"],"msg_direction": ["to_receiver", "to_giver"],"push_kind": ["expo", "web"],"report_status": ["pending", "dismissed", "actioned"],"thread_side": ["giving", "receiving"]
          }
        }
} as const

