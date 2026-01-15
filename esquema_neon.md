CREATE SCHEMA "public";
CREATE SCHEMA "auth";
CREATE SCHEMA "neon_auth";
CREATE SCHEMA "pgrst";
CREATE TYPE "rango_asesor" AS ENUM('trainee', 'junior', 'senior', 'broker', 'team_leader', 'director');
CREATE TABLE "actividades_crm" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"contacto_id" uuid,
	"solicitud_id" uuid,
	"propuesta_id" uuid,
	"usuario_id" uuid,
	"fecha_actividad" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"fecha_recordatorio" timestamp with time zone,
	"completada" boolean DEFAULT false,
	"datos_extra" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"estado" varchar(20) DEFAULT 'pendiente',
	"prioridad" varchar(20) DEFAULT 'normal',
	"nota_completacion" text,
	"fecha_completada" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}',
	"fecha_programada" timestamp with time zone
);
CREATE TABLE "amenidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"codigo" varchar(50) NOT NULL CONSTRAINT "amenidades_codigo_unique" UNIQUE,
	"nombre" varchar(100) NOT NULL,
	"icono" varchar(100),
	"categoria" varchar(50) NOT NULL,
	"traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid
);
CREATE TABLE "api_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid,
	"api_provider" text NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"method" text DEFAULT 'GET',
	"success" boolean DEFAULT true,
	"status_code" integer,
	"error_message" text,
	"response_time_ms" integer,
	"credits_used" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "api_usage_logs_api_provider_check" CHECK (CHECK ((api_provider = ANY (ARRAY['google_maps'::text, 'google_search_console'::text, 'google_ads'::text, 'meta'::text, 'meta_ads'::text, 'email'::text, 'whatsapp'::text])))),
	CONSTRAINT "api_usage_logs_method_check" CHECK (CHECK ((method = ANY (ARRAY['GET'::text, 'POST'::text, 'PUT'::text, 'DELETE'::text, 'PATCH'::text]))))
);
CREATE TABLE "articulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"categoria_id" uuid,
	"slug" varchar(200) NOT NULL UNIQUE,
	"idioma" varchar(5) DEFAULT 'es',
	"titulo" varchar(300) NOT NULL,
	"extracto" text,
	"contenido" text,
	"traducciones" jsonb DEFAULT '{}',
	"imagen_principal" text,
	"imagenes" jsonb DEFAULT '[]',
	"autor_id" uuid,
	"autor_nombre" varchar(200),
	"autor_foto" varchar(500),
	"meta_titulo" varchar(200),
	"meta_descripcion" text,
	"tags" jsonb DEFAULT '[]',
	"publicado" boolean DEFAULT false,
	"destacado" boolean DEFAULT false,
	"fecha_publicacion" timestamp with time zone,
	"vistas" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"slug_traducciones" jsonb DEFAULT '{}',
	CONSTRAINT "articulos_tenant_id_slug_key" UNIQUE("tenant_id","slug")
);
CREATE TABLE "asesor_social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL UNIQUE,
	"platform" text NOT NULL UNIQUE,
	"access_token_encrypted" text NOT NULL,
	"account_id" varchar(100),
	"account_name" varchar(255),
	"account_username" varchar(100),
	"profile_picture_url" varchar(500),
	"token_expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp with time zone,
	"last_error" text,
	"scopes" text[],
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "uq_asesor_social_account_platform" UNIQUE("usuario_id","platform"),
	CONSTRAINT "asesor_social_accounts_platform_check" CHECK (CHECK ((platform = ANY (ARRAY['facebook'::text, 'instagram'::text, 'linkedin'::text, 'tiktok'::text, 'youtube'::text]))))
);
CREATE TABLE "cat_monedas" (
	"codigo" varchar(3) PRIMARY KEY,
	"nombre" varchar(100) NOT NULL,
	"nombre_en" varchar(100),
	"simbolo" varchar(10) NOT NULL,
	"tasa_usd" numeric(18, 8) DEFAULT '1' NOT NULL,
	"decimales" integer DEFAULT 2,
	"formato" varchar(50) DEFAULT '{symbol}{amount}',
	"orden" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"tasa_actualizada_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "catalogo_componentes" (
	"tipo" varchar(50) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" varchar(255),
	"icono" varchar(10),
	"categoria" varchar(50) NOT NULL,
	"campos_config" jsonb DEFAULT '[]' NOT NULL,
	"active" boolean DEFAULT true,
	"id" uuid PRIMARY KEY,
	"variantes" integer DEFAULT 1 NOT NULL,
	"required_features" boolean DEFAULT false,
	"componente_key" varchar(100) NOT NULL CONSTRAINT "uq_catalogo_componentes_key" UNIQUE
);
CREATE TABLE "catalogo_extensiones_contacto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid UNIQUE,
	"codigo" varchar(50) NOT NULL UNIQUE,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"icono" varchar(50),
	"color" varchar(20),
	"campos_schema" jsonb DEFAULT '[]' NOT NULL,
	"orden" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"es_sistema" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "catalogo_extensiones_contacto_tenant_id_codigo_key" UNIQUE("tenant_id","codigo")
);
CREATE TABLE "catalogos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid UNIQUE,
	"tipo" varchar(50) NOT NULL UNIQUE,
	"codigo" varchar(50) NOT NULL UNIQUE,
	"nombre" varchar(100) NOT NULL,
	"nombre_plural" varchar(100),
	"descripcion" text,
	"icono" varchar(100),
	"color" varchar(20),
	"orden" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"es_default" boolean DEFAULT false,
	"config" jsonb,
	"traducciones" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "catalogos_tenant_id_tipo_codigo_key" UNIQUE("tenant_id","tipo","codigo")
);
CREATE TABLE "categorias_contenido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"slug" varchar(100) NOT NULL UNIQUE,
	"tipo" varchar(50) NOT NULL UNIQUE,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"traducciones" jsonb DEFAULT '{}',
	"icono" varchar(100),
	"color" varchar(20),
	"orden" integer DEFAULT 0,
	"activa" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"slug_traducciones" jsonb DEFAULT '{}',
	CONSTRAINT "categorias_contenido_tenant_id_slug_tipo_key" UNIQUE("tenant_id","slug","tipo")
);
CREATE TABLE "categorias_propiedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(50) NOT NULL CONSTRAINT "categorias_propiedades_slug_unique" UNIQUE,
	"nombre" varchar(100) NOT NULL,
	"icono" text,
	"color" varchar(20),
	"descripcion" text,
	"traducciones" jsonb DEFAULT '{}',
	"slug_traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid
);
CREATE TABLE "clic_connect_join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"apellido" varchar(255),
	"telefono" varchar(255),
	"codigo_referido" varchar(255),
	"anos_experiencia" integer,
	"especializacion" varchar(255),
	"agencia_actual" varchar(255),
	"motivacion" text,
	"estado" varchar(255) DEFAULT 'pending',
	"revisado_por" uuid,
	"revisado_at" timestamp with time zone,
	"notas_revision" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "clic_connect_upgrade_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo_solicitud" varchar(255) NOT NULL,
	"razon" text NOT NULL,
	"nombre_tenant_propuesto" varchar(255),
	"plan_propuesto" varchar(255),
	"tamano_equipo_estimado" integer,
	"tenant_original_id" uuid,
	"propiedades_a_migrar" integer DEFAULT 0,
	"propiedades_publicadas" integer DEFAULT 0,
	"propiedades_captacion" integer DEFAULT 0,
	"propiedades_rechazadas" integer DEFAULT 0,
	"tarifa_setup" numeric(10, 2) DEFAULT '0',
	"tarifa_setup_pagada" boolean DEFAULT false,
	"estado" varchar(255) DEFAULT 'pending',
	"revisado_por" uuid,
	"revisado_at" timestamp with time zone,
	"notas_revision" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "comisiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"venta_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"monto" numeric(15, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'USD',
	"porcentaje" numeric(5, 2),
	"estado" varchar(50) DEFAULT 'pendiente',
	"monto_pagado" numeric(15, 2) DEFAULT '0',
	"fecha_pago" timestamp with time zone,
	"tipo" varchar(50) DEFAULT 'venta',
	"notas" text,
	"datos_extra" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"split_porcentaje_vendedor" numeric(5, 2),
	"split_porcentaje_owner" numeric(5, 2),
	"contacto_externo_id" uuid,
	"fecha_entrega_proyecto" date,
	"tipo_participante" varchar(50),
	"escenario" varchar(50),
	"snapshot_distribucion" jsonb,
	"monto_habilitado" numeric(15, 2) DEFAULT '0',
	"es_override" boolean DEFAULT false
);
CREATE TABLE "componentes_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"componente_id" uuid NOT NULL UNIQUE,
	"feature_id" uuid NOT NULL UNIQUE,
	"required" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "unique_componente_feature" UNIQUE("componente_id","feature_id")
);
CREATE TABLE "componentes_web" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"datos" jsonb DEFAULT '{}' NOT NULL,
	"activo" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"nombre" varchar(100),
	"componente_catalogo_id" uuid NOT NULL,
	"tipo_pagina_id" uuid,
	"tenant_rutas_config_custom_id" uuid,
	CONSTRAINT "chk_componentes_web_tipo_or_custom_or_global" CHECK (CHECK ((((tipo_pagina_id IS NULL) AND (tenant_rutas_config_custom_id IS NULL)) OR ((tipo_pagina_id IS NOT NULL) AND (tenant_rutas_config_custom_id IS NULL)) OR ((tipo_pagina_id IS NULL) AND (tenant_rutas_config_custom_id IS NOT NULL)))))
);
CREATE TABLE "config_productividad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL CONSTRAINT "config_productividad_tenant_id_unique" UNIQUE,
	"activo" boolean DEFAULT true,
	"meta_contactos_mes" integer DEFAULT 30,
	"meta_captaciones_mes" integer DEFAULT 2,
	"meta_ventas_mes" integer DEFAULT 1,
	"meta_llamadas_mes" integer DEFAULT 100,
	"meta_visitas_mes" integer DEFAULT 20,
	"meta_propuestas_mes" integer DEFAULT 5,
	"mostrar_ranking" boolean DEFAULT true,
	"notificar_cumplimiento" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"peso_contactos" integer DEFAULT 20,
	"peso_captaciones" integer DEFAULT 25,
	"peso_ventas" integer DEFAULT 30,
	"peso_llamadas" integer DEFAULT 15,
	"peso_visitas" integer DEFAULT 10
);
CREATE TABLE "config_sistema_fases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL CONSTRAINT "config_sistema_fases_tenant_id_unique" UNIQUE,
	"activo" boolean DEFAULT false,
	"propiedad_pool_id" uuid,
	"comision_asesor_pct" numeric(5, 2) DEFAULT '50',
	"comision_empresa_pct" numeric(5, 2) DEFAULT '50',
	"peso_fase_1" integer DEFAULT 100,
	"peso_fase_2" integer DEFAULT 150,
	"peso_fase_3" integer DEFAULT 200,
	"peso_fase_4" integer DEFAULT 250,
	"peso_fase_5" integer DEFAULT 300,
	"intentos_fase_1" integer DEFAULT 3,
	"meses_solitario_max" integer DEFAULT 3,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "contacto_extensiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"contacto_id" uuid NOT NULL UNIQUE,
	"extension_id" uuid NOT NULL UNIQUE,
	"datos" jsonb DEFAULT '{}' NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "contacto_extensiones_contacto_id_extension_id_key" UNIQUE("contacto_id","extension_id")
);
CREATE TABLE "contactos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"apellido" varchar(255),
	"email" varchar(255),
	"telefono" varchar(50),
	"telefono_secundario" varchar(50),
	"whatsapp" varchar(50),
	"tipo" varchar(50) DEFAULT 'lead' NOT NULL,
	"empresa" varchar(255),
	"cargo" varchar(255),
	"origen" varchar(100),
	"favorito" boolean DEFAULT false,
	"notas" text,
	"etiquetas" jsonb DEFAULT '[]',
	"datos_extra" jsonb DEFAULT '{}',
	"usuario_asignado_id" uuid,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"tipos_contacto" jsonb DEFAULT '[]',
	"es_lead_pool" boolean DEFAULT false,
	"origen_lead" varchar(50),
	"lead_asignado_a" uuid,
	"fecha_asignacion_lead" timestamp with time zone
);
CREATE TABLE "contactos_connect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"usuario_connect_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"apellido" varchar(255),
	"email" varchar(255),
	"telefono" varchar(255),
	"notas" text,
	"datos_adicionales" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "contactos_relaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"contacto_origen_id" uuid NOT NULL UNIQUE,
	"contacto_destino_id" uuid NOT NULL UNIQUE,
	"tipo_relacion" varchar(50) NOT NULL UNIQUE,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "idx_contactos_rel_unique" UNIQUE("contacto_origen_id","contacto_destino_id","tipo_relacion")
);
CREATE TABLE "contenido_relaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"tipo_origen" varchar(50) NOT NULL UNIQUE,
	"id_origen" uuid NOT NULL UNIQUE,
	"tipo_destino" varchar(50) NOT NULL UNIQUE,
	"id_destino" uuid NOT NULL UNIQUE,
	"descripcion" text,
	"orden" integer DEFAULT 0,
	"activa" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "contenido_relaciones_tenant_id_tipo_origen_id_origen_tipo_d_key" UNIQUE("tenant_id","tipo_origen","id_origen","tipo_destino","id_destino")
);
CREATE TABLE "content_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"tipo_contenido" varchar(50) NOT NULL UNIQUE,
	"contenido_id" uuid NOT NULL UNIQUE,
	"tag_id" uuid NOT NULL UNIQUE,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "content_tags_tenant_id_tipo_contenido_contenido_id_tag_id_key" UNIQUE("tenant_id","tipo_contenido","contenido_id","tag_id")
);
CREATE TABLE "documentos_requeridos" (
	"id" uuid DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"instrucciones" text,
	"categoria" varchar(50) NOT NULL,
	"tipo" varchar(50),
	"requiere_documento" boolean DEFAULT true,
	"es_obligatorio" boolean DEFAULT false,
	"orden_visualizacion" integer DEFAULT 0,
	"tipos_archivo_permitidos" jsonb DEFAULT '["pdf", "jpg", "jpeg", "png", "doc", "docx"]',
	"tamaño_maximo_archivo" bigint DEFAULT 10485760,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ventas_expediente_requerimientos_pkey" PRIMARY KEY("id")
);
CREATE TABLE "documentos_subidos" (
	"id" uuid DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"venta_id" uuid NOT NULL UNIQUE,
	"requerimiento_id" uuid NOT NULL UNIQUE,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"categoria" varchar(50) NOT NULL,
	"tipo" varchar(50),
	"requiere_documento" boolean DEFAULT true,
	"es_obligatorio" boolean DEFAULT false,
	"estado" varchar(50) DEFAULT 'pendiente',
	"url_documento" text,
	"ruta_documento" text,
	"tipo_archivo" varchar(100),
	"tamaño_archivo" bigint,
	"nombre_documento" varchar(255),
	"fecha_subida_documento" timestamp with time zone,
	"fecha_revision" timestamp with time zone,
	"subido_por_id" uuid,
	"revisado_por_id" uuid,
	"notas_revision" text,
	"comentarios" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ventas_expediente_items_pkey" PRIMARY KEY("id"),
	CONSTRAINT "uq_expediente_items_venta_req" UNIQUE("venta_id","requerimiento_id")
);
CREATE TABLE "equipos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"nombre" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL UNIQUE,
	"descripcion" text,
	"lider_id" uuid,
	"zona_principal" varchar(200),
	"zonas_cobertura" jsonb DEFAULT '[]',
	"meta_mensual" numeric(15, 2),
	"split_comision_equipo" numeric(5, 2),
	"activo" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"asistente_id" uuid,
	"oficina_id" uuid,
	"color" varchar(20) DEFAULT '#3b82f6',
	CONSTRAINT "equipos_tenant_id_slug_unique" UNIQUE("tenant_id","slug")
);
CREATE TABLE "equipos_miembros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"equipo_id" uuid NOT NULL UNIQUE,
	"usuario_id" uuid NOT NULL UNIQUE,
	"rol" varchar(50) DEFAULT 'miembro',
	"fecha_ingreso" date DEFAULT CURRENT_TIMESTAMP,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "equipos_miembros_equipo_id_usuario_id_unique" UNIQUE("equipo_id","usuario_id")
);
CREATE TABLE "estados_venta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"es_final" boolean DEFAULT false,
	"orden" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "facturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"numero_factura" varchar(50) NOT NULL CONSTRAINT "facturas_numero_factura_unique" UNIQUE,
	"plan" varchar(50) NOT NULL,
	"monto" numeric(10, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'USD',
	"estado" varchar(20) DEFAULT 'pendiente',
	"fecha_emision" date NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"fecha_pago" date,
	"metodo_pago" varchar(50),
	"referencia_pago" varchar(100),
	"detalles" jsonb DEFAULT '{}',
	"notas" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"categoria_id" uuid,
	"idioma" varchar(5) DEFAULT 'es',
	"pregunta" text NOT NULL,
	"respuesta" text NOT NULL,
	"traducciones" jsonb DEFAULT '{}',
	"contexto" varchar(100),
	"publicado" boolean DEFAULT true,
	"destacada" boolean DEFAULT false,
	"orden" integer DEFAULT 0,
	"vistas" integer DEFAULT 0,
	"util_si" integer DEFAULT 0,
	"util_no" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"slug_traducciones" jsonb DEFAULT '{}',
	"slug" varchar(255)
);
CREATE TABLE "features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(50) DEFAULT 'puzzle',
	"category" varchar(50) DEFAULT 'addon',
	"is_public" boolean DEFAULT false,
	"is_premium" boolean DEFAULT true,
	"available_in_plans" jsonb DEFAULT '[]',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "idiomas" (
	"codigo" varchar(5) PRIMARY KEY,
	"nombre" varchar(50) NOT NULL,
	"nombre_nativo" varchar(50),
	"prioridad" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "interacciones_connect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"usuario_connect_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" varchar(255) NOT NULL,
	"entidad_tipo" varchar(255),
	"entidad_id" uuid,
	"datos" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "knex_migrations" (
	"id" serial PRIMARY KEY,
	"name" varchar(255),
	"batch" integer,
	"migration_time" timestamp with time zone
);
CREATE TABLE "knex_migrations_lock" (
	"index" serial PRIMARY KEY,
	"is_locked" integer
);
CREATE TABLE "layout_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"tipo_alcance" varchar(50) DEFAULT 'tenant' NOT NULL,
	"alcance_id" uuid,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"nombre" varchar(200),
	"descripcion" text,
	"activa" boolean DEFAULT true,
	"es_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE "metas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid,
	"creado_por_id" uuid,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"tipo_meta" varchar(50) DEFAULT 'ventas' NOT NULL,
	"metrica" varchar(50) DEFAULT 'cantidad' NOT NULL,
	"valor_objetivo" numeric(15, 2) NOT NULL,
	"valor_actual" numeric(15, 2) DEFAULT '0',
	"periodo" varchar(50) DEFAULT 'mensual' NOT NULL,
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_fin" timestamp with time zone NOT NULL,
	"estado" varchar(50) DEFAULT 'activa' NOT NULL,
	"origen" varchar(50) DEFAULT 'personal' NOT NULL,
	"tipo_recompensa" varchar(100),
	"descripcion_recompensa" text,
	"monto_recompensa" numeric(15, 2),
	"fecha_completada" timestamp with time zone,
	"historial_progreso" jsonb DEFAULT '[]',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mock_articulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid,
	"titulo" varchar(255) NOT NULL,
	"resumen" text,
	"contenido" text NOT NULL,
	"autor" varchar(255),
	"thumbnail_url" varchar(255),
	"categoria_id" uuid,
	"tags" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"publicado" boolean DEFAULT true,
	"vistas" integer DEFAULT 0,
	"fecha_publicacion" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mock_asesores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid,
	"nombre" varchar(255) NOT NULL,
	"apellido" varchar(255) NOT NULL,
	"cargo" varchar(255),
	"biografia" text,
	"email" varchar(255),
	"telefono" varchar(255),
	"foto_url" varchar(255),
	"redes_sociales" jsonb DEFAULT '{}',
	"especialidades" jsonb DEFAULT '[]',
	"experiencia_anos" integer DEFAULT 0,
	"propiedades_vendidas" integer DEFAULT 0,
	"logros" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mock_carruseles_propiedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid,
	"nombre" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"configuracion" jsonb DEFAULT '{}' NOT NULL,
	"propiedades_ids" jsonb DEFAULT '[]',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mock_categorias_contenido" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid,
	"tipo_contenido" varchar(50) NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"descripcion" text,
	"icono" varchar(10),
	"numero_elementos" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"traducciones" jsonb DEFAULT '{}',
	"activa" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mock_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid,
	"pregunta" varchar(255) NOT NULL,
	"respuesta" text NOT NULL,
	"categoria" varchar(255),
	"orden" integer DEFAULT 0,
	"traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mock_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mock_testimonios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid,
	"nombre_cliente" varchar(255) NOT NULL,
	"ubicacion" varchar(255),
	"testimonio" text NOT NULL,
	"calificacion" integer DEFAULT 5,
	"foto_url" varchar(255),
	"tipo_propiedad" varchar(255),
	"categoria_id" uuid,
	"metadata" jsonb DEFAULT '{}',
	"traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"fecha" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "mock_textos_sueltos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid UNIQUE,
	"clave" varchar(255) NOT NULL UNIQUE,
	"titulo" varchar(255),
	"contenido_html" text NOT NULL,
	"tipo" varchar(255) DEFAULT 'text',
	"traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "idx_mock_textos_tenant_clave" UNIQUE("tenant_id","clave")
);
CREATE TABLE "mock_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"url_video" varchar(255) NOT NULL,
	"thumbnail_url" varchar(255),
	"duracion" varchar(255),
	"categoria_id" uuid,
	"metadata" jsonb DEFAULT '{}',
	"traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"vistas" integer DEFAULT 0,
	"fecha_publicacion" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "modulos" (
	"id" varchar(50) PRIMARY KEY,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"icono" varchar(50),
	"categoria" varchar(50) NOT NULL,
	"orden" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "niveles_productividad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"nombre" varchar(50) NOT NULL,
	"codigo" varchar(20) NOT NULL UNIQUE,
	"descripcion" text,
	"orden" integer DEFAULT 1,
	"meta_contactos_mes" integer,
	"meta_captaciones_mes" integer,
	"meta_ventas_mes" integer,
	"meta_llamadas_mes" integer,
	"meta_visitas_mes" integer,
	"meta_propuestas_mes" integer,
	"color" varchar(20) DEFAULT '#6366f1',
	"icono" varchar(50),
	"activo" boolean DEFAULT true,
	"es_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "uq_niveles_productividad_tenant_codigo" UNIQUE("tenant_id","codigo")
);
CREATE TABLE "oficinas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"codigo" varchar(50),
	"direccion" text,
	"ciudad" varchar(100),
	"provincia" varchar(100),
	"pais" varchar(100),
	"codigo_postal" varchar(20),
	"telefono" varchar(50),
	"email" varchar(255),
	"zona_trabajo" text,
	"administrador_id" uuid,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "operaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(50) NOT NULL CONSTRAINT "operaciones_slug_unique" UNIQUE,
	"nombre" varchar(100) NOT NULL,
	"icono" varchar(100),
	"color" varchar(20),
	"descripcion" text,
	"traducciones" jsonb DEFAULT '{}',
	"slug_traducciones" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"tenant_id" uuid
);
CREATE TABLE "pagos_comisiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"venta_id" uuid,
	"comision_id" uuid,
	"monto" numeric(15, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'USD',
	"tipo_pago" varchar(50) NOT NULL,
	"fecha_pago" date NOT NULL,
	"fecha_registro" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"notas" text,
	"recibo_url" varchar(255),
	"registrado_por_id" uuid,
	"distribucion" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"activo" boolean DEFAULT true,
	"tipo_movimiento" varchar(20) DEFAULT 'cobro'
);
CREATE TABLE "paises" (
	"codigo" varchar(2) PRIMARY KEY,
	"nombre" varchar(100) NOT NULL,
	"nombre_en" varchar(100),
	"moneda" varchar(3),
	"zona_horaria" varchar(50),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "perfiles_asesor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"usuario_id" uuid NOT NULL UNIQUE,
	"slug" varchar(100) NOT NULL UNIQUE,
	"titulo_profesional" varchar(100),
	"biografia" text,
	"foto_url" varchar(500),
	"video_presentacion_url" varchar(500),
	"especialidades" jsonb DEFAULT '[]',
	"idiomas" jsonb DEFAULT '["es"]',
	"zonas" jsonb DEFAULT '[]',
	"tipos_propiedad" jsonb DEFAULT '[]',
	"experiencia_anos" integer DEFAULT 0,
	"rango" rango_asesor DEFAULT 'junior',
	"fecha_inicio" date,
	"equipo_id" uuid,
	"split_comision" numeric(5, 2) DEFAULT '50',
	"meta_mensual" numeric(15, 2),
	"stats" jsonb DEFAULT '{"total_resenas": 0, "volumen_ventas": 0, "propiedades_activas": 0, "propiedades_vendidas": 0, "tiempo_respuesta_hrs": 24, "calificacion_promedio": 0}',
	"redes_sociales" jsonb DEFAULT '{}',
	"whatsapp" varchar(20),
	"telefono_directo" varchar(20),
	"certificaciones" jsonb DEFAULT '[]',
	"logros" jsonb DEFAULT '[]',
	"activo" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"visible_en_web" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"traducciones" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"plantilla_comision_id" uuid,
	CONSTRAINT "perfiles_asesor_tenant_id_slug_unique" UNIQUE("tenant_id","slug"),
	CONSTRAINT "perfiles_asesor_tenant_id_usuario_id_unique" UNIQUE("tenant_id","usuario_id")
);
CREATE TABLE "permisos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nombre" varchar(255) NOT NULL,
	"codigo" varchar(255) NOT NULL CONSTRAINT "permisos_codigo_unique" UNIQUE,
	"descripcion" text,
	"recurso" varchar(255) NOT NULL,
	"accion" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "plantillas_pagina" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tipo_pagina_id" uuid NOT NULL UNIQUE,
	"componente_catalogo_id" uuid NOT NULL UNIQUE,
	"orden" integer DEFAULT 0 NOT NULL,
	"datos_default" jsonb DEFAULT '{}',
	"es_global" boolean DEFAULT false,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "unique_tipo_pagina_componente" UNIQUE("tipo_pagina_id","componente_catalogo_id")
);
CREATE TABLE "platform_config" (
	"clave" varchar(255) PRIMARY KEY,
	"categoria" varchar(50) NOT NULL,
	"valor" text,
	"tipo" varchar(20) DEFAULT 'string',
	"descripcion" text,
	"es_sensible" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "productividad_metas_usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"usuario_id" uuid NOT NULL UNIQUE,
	"periodo" varchar(7) NOT NULL UNIQUE,
	"meta_contactos" integer,
	"meta_captaciones" integer,
	"meta_ventas" integer,
	"meta_llamadas" integer,
	"meta_visitas" integer,
	"meta_propuestas" integer,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "uq_productividad_metas_periodo" UNIQUE("tenant_id","usuario_id","periodo")
);
CREATE TABLE "productividad_resumen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"usuario_id" uuid NOT NULL UNIQUE,
	"periodo" varchar(7) NOT NULL UNIQUE,
	"tipo_periodo" varchar(10) DEFAULT 'mensual' UNIQUE,
	"semana" integer UNIQUE,
	"contactos_registrados" integer DEFAULT 0,
	"captaciones_registradas" integer DEFAULT 0,
	"ventas_cerradas" integer DEFAULT 0,
	"llamadas_realizadas" integer DEFAULT 0,
	"visitas_realizadas" integer DEFAULT 0,
	"propuestas_enviadas" integer DEFAULT 0,
	"monto_ventas" numeric(15, 2) DEFAULT '0',
	"monto_comisiones" numeric(15, 2) DEFAULT '0',
	"pct_cumplimiento" numeric(5, 2) DEFAULT '0',
	"ultimo_calculo" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "uq_productividad_resumen" UNIQUE("tenant_id","usuario_id","periodo","tipo_periodo","semana")
);
CREATE TABLE "propiedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"titulo" varchar(255) NOT NULL,
	"codigo" varchar(50) UNIQUE,
	"descripcion" text,
	"tipo" varchar(50) DEFAULT 'casa' NOT NULL,
	"operacion" varchar(50) DEFAULT 'venta' NOT NULL,
	"precio" numeric(15, 2),
	"precio_anterior" numeric(15, 2),
	"moneda" varchar(3) DEFAULT 'USD',
	"pais" varchar(100) DEFAULT 'México',
	"provincia" varchar(100),
	"ciudad" varchar(100),
	"sector" varchar(150),
	"direccion" text,
	"latitud" numeric(10, 8),
	"longitud" numeric(11, 8),
	"habitaciones" integer,
	"banos" integer,
	"medios_banos" integer,
	"estacionamientos" integer,
	"m2_construccion" numeric(10, 2),
	"m2_terreno" numeric(10, 2),
	"antiguedad" integer,
	"pisos" integer,
	"amenidades" jsonb DEFAULT '[]',
	"caracteristicas" jsonb DEFAULT '{}',
	"imagen_principal" varchar(500),
	"imagenes" jsonb DEFAULT '[]',
	"video_url" varchar(500),
	"tour_virtual_url" varchar(500),
	"estado_propiedad" varchar(50) DEFAULT 'disponible' NOT NULL,
	"destacada" boolean DEFAULT false,
	"exclusiva" boolean DEFAULT false,
	"agente_id" uuid,
	"propietario_id" uuid,
	"slug" varchar(255),
	"notas" text,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"external_id" varchar(50),
	"external_source" varchar(50),
	"external_url" text,
	"precio_venta" numeric(15, 2),
	"precio_alquiler" numeric(15, 2),
	"maintenance" numeric(15, 2),
	"mostrar_ubicacion_exacta" boolean DEFAULT true,
	"is_project" boolean DEFAULT false,
	"is_furnished" boolean DEFAULT false,
	"featured_until" timestamp with time zone,
	"short_description" text,
	"floor_level" integer,
	"year_built" integer,
	"condition" integer,
	"share_commission" numeric(5, 2),
	"meta_title" varchar(255),
	"meta_description" text,
	"keywords" jsonb DEFAULT '[]',
	"tags" jsonb DEFAULT '[]',
	"documentos" jsonb DEFAULT '[]',
	"tipologias" jsonb DEFAULT '[]',
	"planes_pago" jsonb,
	"etapas" jsonb DEFAULT '[]',
	"beneficios" jsonb DEFAULT '[]',
	"garantias" jsonb DEFAULT '[]',
	"captador_id" uuid,
	"cocaptadores_ids" jsonb DEFAULT '[]',
	"desarrollador_id" uuid,
	"correo_reporte" varchar(255),
	"publicada" boolean DEFAULT false,
	"perfil_asesor_id" uuid,
	"slug_traducciones" jsonb DEFAULT '{}',
	"traducciones" jsonb DEFAULT '{}',
	"ubicacion_id" uuid,
	"precio_min" numeric(15, 2),
	"precio_max" numeric(15, 2),
	"m2_min" numeric(10, 2),
	"m2_max" numeric(10, 2),
	"habitaciones_min" integer,
	"habitaciones_max" integer,
	"banos_min" integer,
	"banos_max" integer,
	"parqueos_min" integer,
	"parqueos_max" integer,
	"nombre_privado" varchar(255),
	"red_global" boolean DEFAULT false,
	"red_afiliados" boolean DEFAULT false,
	"connect" boolean DEFAULT false,
	"portales" jsonb DEFAULT '{}',
	"red_global_comision" text,
	"comision" numeric(5, 2),
	"comision_nota" text,
	"etiquetas" jsonb DEFAULT '[]',
	"codigo_publico" integer,
	"red_afiliados_terminos" text,
	"red_afiliados_comision" numeric(10, 2),
	"connect_terminos" text,
	"connect_comision" numeric(10, 2),
	"disponibilidad_config" jsonb,
	CONSTRAINT "idx_propiedades_tenant_codigo" UNIQUE("tenant_id","codigo")
);
CREATE TABLE "propiedades_connect_acceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"usuario_connect_id" uuid NOT NULL UNIQUE,
	"propiedad_id" uuid NOT NULL UNIQUE,
	"tipo_acceso" varchar(255) DEFAULT 'vista' NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "idx_propiedades_connect_acceso_unique" UNIQUE("usuario_connect_id","propiedad_id","tipo_acceso")
);
CREATE TABLE "propuestas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"estado" varchar(50) DEFAULT 'borrador' NOT NULL,
	"solicitud_id" uuid,
	"contacto_id" uuid,
	"propiedad_id" uuid,
	"usuario_creador_id" uuid,
	"precio_propuesto" numeric(15, 2),
	"moneda" varchar(3) DEFAULT 'MXN',
	"comision_porcentaje" numeric(5, 2),
	"comision_monto" numeric(15, 2),
	"condiciones" text,
	"notas_internas" text,
	"url_publica" varchar(100) CONSTRAINT "propuestas_url_publica_unique" UNIQUE,
	"fecha_expiracion" timestamp with time zone,
	"fecha_enviada" timestamp with time zone,
	"fecha_vista" timestamp with time zone,
	"fecha_respuesta" timestamp with time zone,
	"veces_vista" integer DEFAULT 0,
	"datos_extra" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "propuestas_propiedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"propuesta_id" uuid NOT NULL UNIQUE,
	"propiedad_id" uuid NOT NULL UNIQUE,
	"orden" integer DEFAULT 0,
	"notas" text,
	"precio_especial" numeric(15, 2),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "propuestas_propiedades_propuesta_id_propiedad_id_key" UNIQUE("propuesta_id","propiedad_id")
);
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nombre" varchar(255) NOT NULL,
	"codigo" varchar(255) NOT NULL CONSTRAINT "roles_codigo_unique" UNIQUE,
	"descripcion" text,
	"tipo" varchar(255) NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"tenant_id" uuid,
	"es_protegido" boolean DEFAULT false,
	"color" varchar(20),
	"icono" varchar(50),
	"visible" boolean DEFAULT true,
	"feature_requerido" varchar(100)
);
CREATE TABLE "roles_modulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rol_id" uuid NOT NULL UNIQUE,
	"modulo_id" varchar(50) NOT NULL UNIQUE,
	"puede_ver" boolean DEFAULT false,
	"puede_crear" boolean DEFAULT false,
	"puede_editar" boolean DEFAULT false,
	"puede_eliminar" boolean DEFAULT false,
	"alcance_ver" varchar(20) DEFAULT 'own',
	"alcance_editar" varchar(20) DEFAULT 'own',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "idx_roles_modulos_unique" UNIQUE("rol_id","modulo_id")
);
CREATE TABLE "roles_permisos" (
	"rol_id" uuid,
	"permiso_id" uuid,
	CONSTRAINT "roles_permisos_pkey" PRIMARY KEY("rol_id","permiso_id")
);
CREATE TABLE "seo_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"categoria_id" uuid,
	"slug" varchar(200) UNIQUE,
	"titulo" varchar(300) NOT NULL,
	"descripcion" text,
	"contenido" text NOT NULL,
	"traducciones" jsonb DEFAULT '{}',
	"meta_titulo" varchar(200),
	"meta_descripcion" text,
	"keywords" jsonb DEFAULT '[]',
	"publicado" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"operaciones" text[] DEFAULT '{}',
	"tipo_propiedad_ids" uuid[] DEFAULT '{}',
	"ubicacion_ids" uuid[] DEFAULT '{}',
	CONSTRAINT "seo_stats_tenant_id_slug_key" UNIQUE("tenant_id","slug")
);
CREATE TABLE "sistema_fases_historial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"fase_anterior" integer,
	"fase_nueva" integer NOT NULL,
	"tipo_cambio" varchar(50) NOT NULL,
	"razon" varchar(255),
	"venta_id" uuid,
	"prestige_valor" integer,
	"ultra_valor" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "solicitudes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descripcion" text,
	"etapa" varchar(50) DEFAULT 'nuevo_lead' NOT NULL,
	"purge_power" integer DEFAULT 0,
	"purge_urgency" integer DEFAULT 0,
	"purge_resources" integer DEFAULT 0,
	"purge_genuine" integer DEFAULT 0,
	"purge_expectations" integer DEFAULT 0,
	"contacto_id" uuid,
	"propiedad_id" uuid,
	"usuario_asignado_id" uuid,
	"presupuesto" numeric(15, 2),
	"moneda" varchar(3) DEFAULT 'MXN',
	"valor_estimado" numeric(15, 2),
	"tipo_operacion" varchar(50),
	"tipo_propiedad" varchar(100),
	"zona_interes" varchar(255),
	"recamaras_min" integer,
	"banos_min" integer,
	"fecha_contacto" timestamp with time zone,
	"fecha_cierre_esperada" timestamp with time zone,
	"fecha_cierre_real" timestamp with time zone,
	"razon_perdida" varchar(255),
	"notas" text,
	"etiquetas" jsonb DEFAULT '[]',
	"datos_extra" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"presupuesto_min" numeric(15, 2),
	"presupuesto_max" numeric(15, 2),
	"motivo" varchar(100),
	"prioridad" varchar(50) DEFAULT 'media'
);
CREATE TABLE "suscripciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL CONSTRAINT "idx_suscripciones_tenant_unique" UNIQUE,
	"plan" varchar(50) NOT NULL,
	"estado" varchar(20) DEFAULT 'activa',
	"fecha_inicio" date NOT NULL,
	"fecha_fin" date,
	"proximo_cobro" date,
	"monto_mensual" numeric(10, 2) NOT NULL,
	"metodo_pago_guardado" varchar(50),
	"configuracion" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "tags_global" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"nombre" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL UNIQUE,
	"descripcion" text,
	"categoria" varchar(50),
	"color" varchar(20),
	"activo" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"uso_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tags_global_tenant_id_slug_key" UNIQUE("tenant_id","slug")
);
CREATE TABLE "tags_propiedades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(150) NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"valor" varchar(255),
	"campo_query" varchar(100),
	"operador" varchar(20) DEFAULT '=',
	"alias_idiomas" jsonb DEFAULT '{}',
	"tenant_id" uuid,
	"orden" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"nombre_idiomas" jsonb DEFAULT '{}'
);
CREATE TABLE "temas_tenant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL CONSTRAINT "temas_tenant_tenant_id_unique" UNIQUE,
	"nombre" varchar(255) DEFAULT 'Tema Personalizado' NOT NULL,
	"colores" jsonb DEFAULT '{"text":"#1a202c", "error":"#f56565", "accent":"#f56565", "border":"#e2e8f0", "primary":"#667eea", "success":"#48bb78", "warning":"#ed8936", "secondary":"#764ba2", "background":"#ffffff", "textSecondary":"#718096"}' NOT NULL,
	"tipografia" jsonb DEFAULT '{}',
	"espaciado" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "tenant_api_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL CONSTRAINT "uq_tenant_api_credentials_tenant" UNIQUE,
	"google_api_key_encrypted" text,
	"google_search_console_refresh_token_encrypted" text,
	"google_search_console_site_url" varchar(500),
	"google_search_console_token_expires_at" timestamp with time zone,
	"google_search_console_connected" boolean DEFAULT false,
	"google_ads_refresh_token_encrypted" text,
	"google_ads_customer_id" varchar(50),
	"google_ads_manager_id" varchar(50),
	"google_ads_token_expires_at" timestamp with time zone,
	"google_ads_connected" boolean DEFAULT false,
	"meta_page_access_token_encrypted" text,
	"meta_page_id" varchar(50),
	"meta_page_name" varchar(255),
	"meta_instagram_business_account_id" varchar(50),
	"meta_instagram_username" varchar(100),
	"meta_token_expires_at" timestamp with time zone,
	"meta_connected" boolean DEFAULT false,
	"meta_ads_access_token_encrypted" text,
	"meta_ad_account_id" varchar(50),
	"meta_business_id" varchar(50),
	"meta_ads_token_expires_at" timestamp with time zone,
	"meta_ads_connected" boolean DEFAULT false,
	"email_provider" text DEFAULT 'none',
	"email_api_key_encrypted" text,
	"email_sender_name" varchar(255),
	"email_sender_email" varchar(255),
	"email_list_id" varchar(100),
	"email_connected" boolean DEFAULT false,
	"smtp_host" varchar(255),
	"smtp_port" integer,
	"smtp_username" varchar(255),
	"smtp_password_encrypted" text,
	"smtp_secure" boolean DEFAULT true,
	"whatsapp_phone_number_id" varchar(50),
	"whatsapp_access_token_encrypted" text,
	"whatsapp_connected" boolean DEFAULT false,
	"connected_by" uuid,
	"last_sync_at" timestamp with time zone,
	"connection_errors" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "tenant_api_credentials_email_provider_check" CHECK (CHECK ((email_provider = ANY (ARRAY['mailchimp'::text, 'sendgrid'::text, 'mailjet'::text, 'ses'::text, 'smtp'::text, 'none'::text]))))
);
CREATE TABLE "tenant_catalogo_preferencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"catalogo_id" uuid NOT NULL UNIQUE,
	"activo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tenant_catalogo_preferencias_tenant_id_catalogo_id_key" UNIQUE("tenant_id","catalogo_id")
);
CREATE TABLE "tenant_extension_preferencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"extension_id" uuid NOT NULL UNIQUE,
	"activo" boolean NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"opciones_personalizadas" jsonb DEFAULT '{}',
	"updated_at" timestamp DEFAULT now(),
	"campos_override" jsonb,
	CONSTRAINT "tenant_extension_preferencias_tenant_id_extension_id_key" UNIQUE("tenant_id","extension_id")
);
CREATE TABLE "tenant_global_catalogo_preferencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"tabla" varchar(100) NOT NULL UNIQUE,
	"item_id" uuid NOT NULL UNIQUE,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_tenant_global_pref" UNIQUE("tenant_id","tabla","item_id")
);
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nombre" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL CONSTRAINT "tenants_slug_unique" UNIQUE,
	"codigo_pais" varchar(2),
	"idioma_default" varchar(5) DEFAULT 'es',
	"idiomas_disponibles" jsonb DEFAULT '["es", "en", "fr"]',
	"configuracion" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"dominio_personalizado" varchar(255) CONSTRAINT "tenants_dominio_personalizado_unique" UNIQUE,
	"plan" varchar(50) DEFAULT 'basic',
	"red_global_comision_default" text,
	"connect_comision_default" text,
	"monedas_habilitadas" jsonb,
	"info_negocio" jsonb,
	"red_global_porcentaje_default" numeric(10, 2) DEFAULT '50',
	"red_afiliados_terminos_default" text,
	"red_afiliados_porcentaje_default" numeric(10, 2) DEFAULT '50',
	"connect_porcentaje_default" numeric(10, 2) DEFAULT '50'
);
CREATE TABLE "tenants_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"feature_id" uuid NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "idx_tenants_features_unique" UNIQUE("tenant_id","feature_id")
);
CREATE TABLE "tenants_rutas_config_custom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"prefijo" varchar(100) NOT NULL UNIQUE,
	"nivel_navegacion" integer DEFAULT 1 NOT NULL,
	"alias_idiomas" jsonb DEFAULT '{}',
	"habilitado" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"tipo_pagina_id" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "tenants_rutas_config_custom_tenant_id_prefijo_unique" UNIQUE("tenant_id","prefijo")
);
CREATE TABLE "testimonios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"categoria_id" uuid,
	"slug" varchar(200) NOT NULL UNIQUE,
	"idioma" varchar(5) DEFAULT 'es',
	"cliente_nombre" varchar(200) NOT NULL,
	"cliente_cargo" varchar(200),
	"cliente_empresa" varchar(200),
	"cliente_foto" text,
	"cliente_ubicacion" varchar(200),
	"titulo" varchar(300),
	"contenido" text NOT NULL,
	"traducciones" jsonb DEFAULT '{}',
	"rating" numeric(2, 1) DEFAULT '5.0',
	"propiedad_id" uuid,
	"publicado" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"fecha" timestamp with time zone DEFAULT now(),
	"verificado" boolean DEFAULT false,
	"fuente" varchar(100),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"contacto_id" uuid,
	"asesor_id" uuid,
	"slug_traducciones" jsonb DEFAULT '{}',
	CONSTRAINT "testimonios_tenant_id_slug_key" UNIQUE("tenant_id","slug")
);
CREATE TABLE "tipos_pagina" (
	"codigo" varchar(50) NOT NULL CONSTRAINT "tipos_pagina_codigo_unique" UNIQUE,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"es_estandar" boolean DEFAULT true,
	"requiere_slug" boolean DEFAULT true,
	"configuracion" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"ruta_patron" varchar(200),
	"ruta_padre" varchar(50),
	"nivel" integer DEFAULT 0,
	"fuente_datos" varchar(100),
	"feature_requerido" varchar(100),
	"es_plantilla" boolean DEFAULT false,
	"protegida" boolean DEFAULT false,
	"parametros" jsonb DEFAULT '[]',
	"alias_rutas" jsonb DEFAULT '{}',
	"visible" boolean DEFAULT true,
	"featured" boolean DEFAULT false,
	"publico" boolean DEFAULT true,
	"orden_catalogo" integer DEFAULT 100,
	"categoria" varchar(20) DEFAULT 'estandar',
	"plan_minimo" varchar(20),
	"is_visible_default" boolean DEFAULT true,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
);
CREATE TABLE "ubicaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_id" uuid UNIQUE,
	"tipo" varchar(20) NOT NULL,
	"nivel" integer NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL UNIQUE,
	"codigo" varchar(10),
	"tagline" varchar(500),
	"descripcion" text,
	"descripcion_corta" text,
	"meta_title" varchar(255),
	"meta_description" varchar(500),
	"meta_keywords" jsonb,
	"imagenes" jsonb,
	"lugares_cercanos" jsonb,
	"servicios" jsonb,
	"stats" jsonb,
	"latitud" numeric(10, 7),
	"longitud" numeric(10, 7),
	"bounds" jsonb,
	"traducciones" jsonb,
	"slug_traducciones" jsonb,
	"destacado" boolean DEFAULT false,
	"mostrar_en_menu" boolean DEFAULT true,
	"mostrar_en_filtros" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"alias" jsonb DEFAULT '[]',
	CONSTRAINT "ubicaciones_parent_id_slug_key" UNIQUE("parent_id","slug"),
	CONSTRAINT "ubicaciones_tipo_check" CHECK (CHECK (((tipo)::text = ANY ((ARRAY['pais'::character varying, 'provincia'::character varying, 'ciudad'::character varying, 'sector'::character varying, 'zona'::character varying])::text[]))))
);
CREATE TABLE "unidades_proyecto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"propiedad_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"tipologia_id" varchar(100),
	"tipologia_nombre" varchar(255),
	"habitaciones" integer,
	"banos" integer,
	"m2" numeric(10, 2),
	"precio" numeric(15, 2),
	"moneda" varchar(10) DEFAULT 'USD',
	"torre" varchar(100),
	"piso" varchar(50),
	"nivel" varchar(50),
	"estado" varchar(50) DEFAULT 'disponible',
	"fecha_reserva" timestamp,
	"fecha_venta" timestamp,
	"reservado_por" uuid,
	"vendido_a" uuid,
	"notas" text,
	"orden" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "university_certificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"imagen_template" varchar(500),
	"campos_personalizados" jsonb DEFAULT '{}',
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "university_certificados_emitidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"inscripcion_id" uuid NOT NULL UNIQUE,
	"certificado_id" uuid NOT NULL UNIQUE,
	"codigo_verificacion" varchar(50) NOT NULL CONSTRAINT "university_certificados_emitidos_codigo_verificacion_key" UNIQUE,
	"nombre_estudiante" varchar(200),
	"url_certificado" varchar(500),
	"fecha_emision" timestamp DEFAULT now(),
	"datos_certificado" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"url_pdf" varchar(500),
	"curso_titulo" varchar(255),
	CONSTRAINT "uk_certificados_emitidos_inscripcion_certificado" UNIQUE("inscripcion_id","certificado_id")
);
CREATE TABLE "university_cursos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"titulo" varchar(300) NOT NULL,
	"descripcion" text,
	"imagen_portada" varchar(500),
	"nivel" varchar(50) DEFAULT 'principiante',
	"duracion_estimada_minutos" integer DEFAULT 0,
	"estado" varchar(20) DEFAULT 'borrador',
	"es_pago" boolean DEFAULT false,
	"precio" numeric(10, 2),
	"moneda" varchar(3) DEFAULT 'USD',
	"orden" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}',
	"fecha_publicacion" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "university_cursos_estado_check" CHECK (CHECK (((estado)::text = ANY ((ARRAY['borrador'::character varying, 'publicado'::character varying, 'archivado'::character varying])::text[]))))
);
CREATE TABLE "university_cursos_acceso_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"curso_id" uuid NOT NULL UNIQUE,
	"rol_id" uuid NOT NULL UNIQUE,
	"seccion_limite_id" uuid,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "university_cursos_acceso_roles_curso_id_rol_id_key" UNIQUE("curso_id","rol_id")
);
CREATE TABLE "university_cursos_certificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"curso_id" uuid NOT NULL UNIQUE,
	"certificado_id" uuid NOT NULL UNIQUE,
	"porcentaje_requerido" integer DEFAULT 100,
	"requiere_examen" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "university_cursos_certificados_curso_id_certificado_id_key" UNIQUE("curso_id","certificado_id")
);
CREATE TABLE "university_inscripciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"curso_id" uuid NOT NULL UNIQUE,
	"usuario_id" uuid UNIQUE,
	"email_usuario" varchar(255) NOT NULL,
	"nombre_usuario" varchar(200),
	"estado" varchar(20) DEFAULT 'activa',
	"progreso_porcentaje" integer DEFAULT 0,
	"pago_completado" boolean DEFAULT false,
	"monto_pagado" numeric(10, 2),
	"fecha_inscripcion" timestamp DEFAULT now(),
	"fecha_completado" timestamp,
	"fecha_expiracion" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "university_inscripciones_curso_id_usuario_id_key" UNIQUE("curso_id","usuario_id"),
	CONSTRAINT "university_inscripciones_estado_check" CHECK (CHECK (((estado)::text = ANY ((ARRAY['activa'::character varying, 'completada'::character varying, 'cancelada'::character varying, 'expirada'::character varying])::text[]))))
);
CREATE TABLE "university_progreso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"inscripcion_id" uuid NOT NULL UNIQUE,
	"video_id" uuid NOT NULL UNIQUE,
	"segundos_vistos" integer DEFAULT 0,
	"porcentaje_completado" integer DEFAULT 0,
	"completado" boolean DEFAULT false,
	"ultimo_acceso" timestamp DEFAULT now(),
	"fecha_completado" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "university_progreso_inscripcion_id_video_id_key" UNIQUE("inscripcion_id","video_id")
);
CREATE TABLE "university_secciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"curso_id" uuid NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text,
	"orden" integer DEFAULT 0,
	"es_pago_adicional" boolean DEFAULT false,
	"precio_seccion" numeric(10, 2),
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "university_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"seccion_id" uuid NOT NULL,
	"titulo" varchar(300) NOT NULL,
	"descripcion" text,
	"url_video" varchar(500) NOT NULL,
	"proveedor" varchar(50) DEFAULT 'youtube',
	"video_id" varchar(100),
	"duracion_segundos" integer DEFAULT 0,
	"thumbnail" varchar(500),
	"orden" integer DEFAULT 0,
	"es_preview" boolean DEFAULT false,
	"es_pago_adicional" boolean DEFAULT false,
	"precio_video" numeric(10, 2),
	"recursos_adjuntos" jsonb DEFAULT '[]',
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(255) NOT NULL CONSTRAINT "usuarios_email_unique" UNIQUE,
	"password_hash" varchar(255),
	"nombre" varchar(255),
	"apellido" varchar(255),
	"idioma_preferido" varchar(5) DEFAULT 'es',
	"codigo_pais" varchar(2),
	"es_platform_admin" boolean DEFAULT false,
	"activo" boolean DEFAULT true,
	"ultimo_acceso" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"clerk_id" varchar(255) CONSTRAINT "usuarios_clerk_id_unique" UNIQUE,
	"avatar_url" varchar(500),
	"telefono" varchar(20),
	"cedula" varchar(50),
	"fecha_nacimiento" date,
	"direccion" varchar(500),
	"ciudad" varchar(100),
	"estado" varchar(100),
	"codigo_postal" varchar(20),
	"pais" varchar(100),
	"empresa" varchar(255),
	"cargo" varchar(255),
	"departamento" varchar(255),
	"notas" text,
	"datos_extra" jsonb DEFAULT '{}',
	"tipos_usuario" jsonb DEFAULT '[]',
	"oficina_id" uuid,
	"equipo_id" uuid
);
CREATE TABLE "usuarios_connect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"email" varchar(255) NOT NULL UNIQUE,
	"nombre" varchar(255) NOT NULL,
	"apellido" varchar(255),
	"telefono" varchar(255),
	"clerk_user_id" varchar(255),
	"activo" boolean DEFAULT true,
	"fecha_registro" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"ultimo_acceso" timestamp with time zone,
	"configuracion" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "idx_usuarios_connect_tenant_email" UNIQUE("tenant_id","email")
);
CREATE TABLE "usuarios_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"descripcion" text,
	"nombre_archivo" varchar(255) NOT NULL,
	"ruta_archivo" varchar(500) NOT NULL,
	"tipo_mime" varchar(100),
	"tamanio_bytes" integer,
	"metadata" jsonb DEFAULT '{}',
	"es_publico" boolean DEFAULT false,
	"subido_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "usuarios_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"usuario_id" uuid NOT NULL UNIQUE,
	"tenant_id" uuid UNIQUE,
	"rol_id" uuid NOT NULL UNIQUE,
	"asignado_por" uuid,
	"asignado_en" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"activo" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "idx_usuarios_roles_unique" UNIQUE("usuario_id","tenant_id","rol_id")
);
CREATE TABLE "usuarios_tenants" (
	"usuario_id" uuid,
	"tenant_id" uuid,
	"es_owner" boolean DEFAULT false,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"ref" varchar(50) CONSTRAINT "usuarios_tenants_ref_unique" UNIQUE,
	"en_sistema_fases" boolean DEFAULT false,
	"fase_actual" integer DEFAULT 1,
	"en_modo_solitario" boolean DEFAULT false,
	"intentos_fase_1_usados" integer DEFAULT 0,
	"meses_solitario_sin_venta" integer DEFAULT 0,
	"prestige" integer DEFAULT 0,
	"ventas_fase_5_contador" integer DEFAULT 0,
	"ultra_record" integer DEFAULT 0,
	"ultra_mes" varchar(7),
	"ventas_mes_actual" integer DEFAULT 0,
	"mes_tracking" varchar(7),
	"fecha_ingreso_fases" timestamp with time zone,
	"nivel_productividad_id" uuid,
	CONSTRAINT "usuarios_tenants_pkey" PRIMARY KEY("usuario_id","tenant_id")
);
CREATE TABLE "ventas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"numero_venta" integer,
	"nombre_negocio" varchar(255),
	"descripcion" text,
	"propiedad_id" uuid,
	"contacto_id" uuid,
	"usuario_cerrador_id" uuid,
	"equipo_id" uuid,
	"estado_venta_id" uuid,
	"es_propiedad_externa" boolean DEFAULT false,
	"nombre_propiedad_externa" varchar(255),
	"codigo_propiedad_externa" varchar(100),
	"ciudad_propiedad" varchar(100),
	"sector_propiedad" varchar(100),
	"categoria_propiedad" varchar(100),
	"numero_unidad" varchar(50),
	"valor_cierre" numeric(15, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'USD',
	"porcentaje_comision" numeric(5, 2),
	"monto_comision" numeric(15, 2),
	"estado_comision" varchar(50) DEFAULT 'pendiente',
	"monto_comision_pagado" numeric(15, 2) DEFAULT '0',
	"fecha_pago_comision" timestamp with time zone,
	"notas_comision" text,
	"fecha_cierre" timestamp with time zone,
	"fecha_creacion" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"referidor_nombre" varchar(255),
	"referidor_id" uuid,
	"aplica_impuestos" boolean DEFAULT false,
	"monto_impuestos" numeric(15, 2),
	"completada" boolean DEFAULT false,
	"cancelada" boolean DEFAULT false,
	"fecha_cancelacion" timestamp with time zone,
	"cancelado_por_id" uuid,
	"razon_cancelacion" text,
	"datos_extra" jsonb DEFAULT '{}',
	"notas" text,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"vendedor_externo_tipo" varchar(50),
	"vendedor_externo_nombre" varchar(255),
	"vendedor_externo_contacto" varchar(255),
	"vendedor_externo_id" uuid,
	"referidor_contacto_id" uuid,
	"perfil_asesor_id" uuid,
	"cache_monto_cobrado" numeric(15, 2) DEFAULT '0',
	"cache_porcentaje_cobrado" numeric(5, 2) DEFAULT '0',
	"cache_monto_pagado_asesores" numeric(15, 2) DEFAULT '0',
	"estado_cobro" varchar(50) DEFAULT 'pendiente',
	"estado_pagos" varchar(50) DEFAULT 'pendiente',
	"unidad_id" uuid,
	"captador_id" uuid,
	"solicitud_id" uuid
);
CREATE TABLE "ventas_cobros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"venta_id" uuid NOT NULL,
	"monto" numeric(15, 2) NOT NULL,
	"moneda" varchar(3) DEFAULT 'USD',
	"fecha_cobro" date NOT NULL,
	"metodo_pago" varchar(50),
	"referencia" varchar(100),
	"banco" varchar(100),
	"recibo_url" varchar(500),
	"notas" text,
	"registrado_por_id" uuid,
	"fecha_registro" timestamp DEFAULT now(),
	"activo" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
CREATE TABLE "ventas_historial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL,
	"venta_id" uuid NOT NULL,
	"tipo_cambio" varchar(50) NOT NULL,
	"entidad" varchar(50),
	"entidad_id" uuid,
	"datos_anteriores" jsonb,
	"datos_nuevos" jsonb,
	"descripcion" text NOT NULL,
	"usuario_id" uuid,
	"usuario_nombre" varchar(200),
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tenant_id" uuid NOT NULL UNIQUE,
	"categoria_id" uuid,
	"slug" varchar(200) NOT NULL UNIQUE,
	"idioma" varchar(5) DEFAULT 'es',
	"titulo" varchar(300) NOT NULL,
	"descripcion" text,
	"traducciones" jsonb DEFAULT '{}',
	"tipo_video" varchar(50) DEFAULT 'youtube',
	"video_url" text NOT NULL,
	"video_id" varchar(100),
	"embed_code" text,
	"thumbnail" text,
	"duracion_segundos" integer,
	"propiedad_id" uuid,
	"tags" jsonb DEFAULT '[]',
	"publicado" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"fecha_publicacion" timestamp with time zone DEFAULT now(),
	"vistas" integer DEFAULT 0,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"slug_traducciones" jsonb DEFAULT '{}',
	"autor_id" uuid,
	CONSTRAINT "videos_tenant_id_slug_key" UNIQUE("tenant_id","slug")
);
CREATE TABLE "neon_auth"."users_sync" (
	"raw_json" jsonb NOT NULL,
	"id" text PRIMARY KEY GENERATED ALWAYS AS ((raw_json ->> 'id'::text)) STORED,
	"name" text GENERATED ALWAYS AS ((raw_json ->> 'display_name'::text)) STORED,
	"email" text GENERATED ALWAYS AS ((raw_json ->> 'primary_email'::text)) STORED,
	"created_at" timestamp with time zone GENERATED ALWAYS AS (to_timestamp((trunc((((raw_json ->> 'signed_up_at_millis'::text))::bigint)::double precision) / (1000)::double precision))) STORED,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
ALTER TABLE "actividades_crm" ADD CONSTRAINT "actividades_crm_contacto_id_foreign" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE CASCADE;
ALTER TABLE "actividades_crm" ADD CONSTRAINT "actividades_crm_propuesta_id_foreign" FOREIGN KEY ("propuesta_id") REFERENCES "propuestas"("id") ON DELETE CASCADE;
ALTER TABLE "actividades_crm" ADD CONSTRAINT "actividades_crm_solicitud_id_foreign" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE CASCADE;
ALTER TABLE "actividades_crm" ADD CONSTRAINT "actividades_crm_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "actividades_crm" ADD CONSTRAINT "actividades_crm_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "amenidades" ADD CONSTRAINT "amenidades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "articulos" ADD CONSTRAINT "articulos_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "articulos" ADD CONSTRAINT "articulos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_contenido"("id") ON DELETE SET NULL;
ALTER TABLE "articulos" ADD CONSTRAINT "articulos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "asesor_social_accounts" ADD CONSTRAINT "asesor_social_accounts_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "asesor_social_accounts" ADD CONSTRAINT "asesor_social_accounts_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "catalogo_extensiones_contacto" ADD CONSTRAINT "catalogo_extensiones_contacto_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "catalogos" ADD CONSTRAINT "catalogos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "categorias_contenido" ADD CONSTRAINT "categorias_contenido_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "categorias_propiedades" ADD CONSTRAINT "categorias_propiedades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "clic_connect_join_requests" ADD CONSTRAINT "clic_connect_join_requests_revisado_por_foreign" FOREIGN KEY ("revisado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "clic_connect_join_requests" ADD CONSTRAINT "clic_connect_join_requests_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "clic_connect_upgrade_requests" ADD CONSTRAINT "clic_connect_upgrade_requests_revisado_por_foreign" FOREIGN KEY ("revisado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "clic_connect_upgrade_requests" ADD CONSTRAINT "clic_connect_upgrade_requests_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "clic_connect_upgrade_requests" ADD CONSTRAINT "clic_connect_upgrade_requests_tenant_original_id_foreign" FOREIGN KEY ("tenant_original_id") REFERENCES "tenants"("id") ON DELETE SET NULL;
ALTER TABLE "clic_connect_upgrade_requests" ADD CONSTRAINT "clic_connect_upgrade_requests_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_contacto_externo_id_foreign" FOREIGN KEY ("contacto_externo_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_venta_id_foreign" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE;
ALTER TABLE "componentes_features" ADD CONSTRAINT "componentes_features_componente_id_foreign" FOREIGN KEY ("componente_id") REFERENCES "catalogo_componentes"("id") ON DELETE CASCADE;
ALTER TABLE "componentes_features" ADD CONSTRAINT "componentes_features_feature_id_foreign" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE;
ALTER TABLE "componentes_web" ADD CONSTRAINT "componentes_web_componente_catalogo_id_fkey" FOREIGN KEY ("componente_catalogo_id") REFERENCES "catalogo_componentes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "componentes_web" ADD CONSTRAINT "componentes_web_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "componentes_web" ADD CONSTRAINT "componentes_web_tenant_rutas_config_custom_id_fkey" FOREIGN KEY ("tenant_rutas_config_custom_id") REFERENCES "tenants_rutas_config_custom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "componentes_web" ADD CONSTRAINT "componentes_web_tipo_pagina_id_fkey" FOREIGN KEY ("tipo_pagina_id") REFERENCES "tipos_pagina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "config_productividad" ADD CONSTRAINT "config_productividad_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "config_sistema_fases" ADD CONSTRAINT "config_sistema_fases_propiedad_pool_id_foreign" FOREIGN KEY ("propiedad_pool_id") REFERENCES "propiedades"("id") ON DELETE SET NULL;
ALTER TABLE "config_sistema_fases" ADD CONSTRAINT "config_sistema_fases_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "contacto_extensiones" ADD CONSTRAINT "contacto_extensiones_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE CASCADE;
ALTER TABLE "contacto_extensiones" ADD CONSTRAINT "contacto_extensiones_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "contacto_extensiones" ADD CONSTRAINT "contacto_extensiones_extension_id_fkey" FOREIGN KEY ("extension_id") REFERENCES "catalogo_extensiones_contacto"("id") ON DELETE CASCADE;
ALTER TABLE "contacto_extensiones" ADD CONSTRAINT "contacto_extensiones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_lead_asignado_a_foreign" FOREIGN KEY ("lead_asignado_a") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_usuario_asignado_id_foreign" FOREIGN KEY ("usuario_asignado_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "contactos_connect" ADD CONSTRAINT "contactos_connect_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "contactos_connect" ADD CONSTRAINT "contactos_connect_usuario_connect_id_foreign" FOREIGN KEY ("usuario_connect_id") REFERENCES "usuarios_connect"("id") ON DELETE CASCADE;
ALTER TABLE "contactos_relaciones" ADD CONSTRAINT "contactos_relaciones_contacto_destino_id_foreign" FOREIGN KEY ("contacto_destino_id") REFERENCES "contactos"("id") ON DELETE CASCADE;
ALTER TABLE "contactos_relaciones" ADD CONSTRAINT "contactos_relaciones_contacto_origen_id_foreign" FOREIGN KEY ("contacto_origen_id") REFERENCES "contactos"("id") ON DELETE CASCADE;
ALTER TABLE "contactos_relaciones" ADD CONSTRAINT "contactos_relaciones_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "contenido_relaciones" ADD CONSTRAINT "contenido_relaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags_global"("id") ON DELETE CASCADE;
ALTER TABLE "content_tags" ADD CONSTRAINT "content_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "documentos_requeridos" ADD CONSTRAINT "ventas_expediente_requerimientos_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "documentos_subidos" ADD CONSTRAINT "documentos_subidos_requerimiento_id_foreign" FOREIGN KEY ("requerimiento_id") REFERENCES "documentos_requeridos"("id") ON DELETE CASCADE;
ALTER TABLE "documentos_subidos" ADD CONSTRAINT "ventas_expediente_items_revisado_por_id_foreign" FOREIGN KEY ("revisado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "documentos_subidos" ADD CONSTRAINT "ventas_expediente_items_subido_por_id_foreign" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "documentos_subidos" ADD CONSTRAINT "ventas_expediente_items_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "documentos_subidos" ADD CONSTRAINT "ventas_expediente_items_venta_id_foreign" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE;
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_asistente_id_fkey" FOREIGN KEY ("asistente_id") REFERENCES "usuarios"("id");
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_lider_id_foreign" FOREIGN KEY ("lider_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_oficina_id_fkey" FOREIGN KEY ("oficina_id") REFERENCES "oficinas"("id");
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "equipos_miembros" ADD CONSTRAINT "equipos_miembros_equipo_id_foreign" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE CASCADE;
ALTER TABLE "equipos_miembros" ADD CONSTRAINT "equipos_miembros_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "estados_venta" ADD CONSTRAINT "estados_venta_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_contenido"("id") ON DELETE SET NULL;
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "interacciones_connect" ADD CONSTRAINT "interacciones_connect_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "interacciones_connect" ADD CONSTRAINT "interacciones_connect_usuario_connect_id_foreign" FOREIGN KEY ("usuario_connect_id") REFERENCES "usuarios_connect"("id") ON DELETE CASCADE;
ALTER TABLE "layout_configs" ADD CONSTRAINT "layout_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "metas" ADD CONSTRAINT "metas_creado_por_id_foreign" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "metas" ADD CONSTRAINT "metas_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "metas" ADD CONSTRAINT "metas_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "mock_articulos" ADD CONSTRAINT "mock_articulos_categoria_id_foreign" FOREIGN KEY ("categoria_id") REFERENCES "mock_categorias_contenido"("id") ON DELETE SET NULL;
ALTER TABLE "mock_articulos" ADD CONSTRAINT "mock_articulos_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mock_asesores" ADD CONSTRAINT "mock_asesores_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mock_carruseles_propiedades" ADD CONSTRAINT "mock_carruseles_propiedades_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mock_categorias_contenido" ADD CONSTRAINT "mock_categorias_contenido_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mock_faqs" ADD CONSTRAINT "mock_faqs_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mock_stats" ADD CONSTRAINT "mock_stats_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mock_testimonios" ADD CONSTRAINT "mock_testimonios_categoria_id_foreign" FOREIGN KEY ("categoria_id") REFERENCES "mock_categorias_contenido"("id") ON DELETE SET NULL;
ALTER TABLE "mock_testimonios" ADD CONSTRAINT "mock_testimonios_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mock_textos_sueltos" ADD CONSTRAINT "mock_textos_sueltos_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "mock_videos" ADD CONSTRAINT "mock_videos_categoria_id_foreign" FOREIGN KEY ("categoria_id") REFERENCES "mock_categorias_contenido"("id") ON DELETE SET NULL;
ALTER TABLE "mock_videos" ADD CONSTRAINT "mock_videos_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "niveles_productividad" ADD CONSTRAINT "niveles_productividad_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "oficinas" ADD CONSTRAINT "oficinas_administrador_id_foreign" FOREIGN KEY ("administrador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "oficinas" ADD CONSTRAINT "oficinas_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "operaciones" ADD CONSTRAINT "operaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pagos_comisiones" ADD CONSTRAINT "pagos_comisiones_comision_id_foreign" FOREIGN KEY ("comision_id") REFERENCES "comisiones"("id") ON DELETE CASCADE;
ALTER TABLE "pagos_comisiones" ADD CONSTRAINT "pagos_comisiones_registrado_por_id_foreign" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "pagos_comisiones" ADD CONSTRAINT "pagos_comisiones_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "pagos_comisiones" ADD CONSTRAINT "pagos_comisiones_venta_id_foreign" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE;
ALTER TABLE "perfiles_asesor" ADD CONSTRAINT "perfiles_asesor_equipo_id_foreign" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE SET NULL;
ALTER TABLE "perfiles_asesor" ADD CONSTRAINT "perfiles_asesor_plantilla_comision_fk" FOREIGN KEY ("plantilla_comision_id") REFERENCES "catalogos"("id") ON DELETE SET NULL;
ALTER TABLE "perfiles_asesor" ADD CONSTRAINT "perfiles_asesor_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "perfiles_asesor" ADD CONSTRAINT "perfiles_asesor_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "plantillas_pagina" ADD CONSTRAINT "plantillas_pagina_componente_catalogo_id_foreign" FOREIGN KEY ("componente_catalogo_id") REFERENCES "catalogo_componentes"("id") ON DELETE CASCADE;
ALTER TABLE "plantillas_pagina" ADD CONSTRAINT "plantillas_pagina_tipo_pagina_id_foreign" FOREIGN KEY ("tipo_pagina_id") REFERENCES "tipos_pagina"("id") ON DELETE CASCADE;
ALTER TABLE "productividad_metas_usuario" ADD CONSTRAINT "productividad_metas_usuario_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "productividad_metas_usuario" ADD CONSTRAINT "productividad_metas_usuario_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "productividad_resumen" ADD CONSTRAINT "productividad_resumen_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "productividad_resumen" ADD CONSTRAINT "productividad_resumen_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_agente_id_foreign" FOREIGN KEY ("agente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_captador_id_foreign" FOREIGN KEY ("captador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_desarrollador_id_foreign" FOREIGN KEY ("desarrollador_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_perfil_asesor_id_foreign" FOREIGN KEY ("perfil_asesor_id") REFERENCES "perfiles_asesor"("id") ON DELETE SET NULL;
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_propietario_id_foreign" FOREIGN KEY ("propietario_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "propiedades" ADD CONSTRAINT "propiedades_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL;
ALTER TABLE "propiedades_connect_acceso" ADD CONSTRAINT "propiedades_connect_acceso_propiedad_id_foreign" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE;
ALTER TABLE "propiedades_connect_acceso" ADD CONSTRAINT "propiedades_connect_acceso_usuario_connect_id_foreign" FOREIGN KEY ("usuario_connect_id") REFERENCES "usuarios_connect"("id") ON DELETE CASCADE;
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_contacto_id_foreign" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_solicitud_id_foreign" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE SET NULL;
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_usuario_creador_id_foreign" FOREIGN KEY ("usuario_creador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "propuestas_propiedades" ADD CONSTRAINT "propuestas_propiedades_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE;
ALTER TABLE "propuestas_propiedades" ADD CONSTRAINT "propuestas_propiedades_propuesta_id_fkey" FOREIGN KEY ("propuesta_id") REFERENCES "propuestas"("id") ON DELETE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "roles_modulos" ADD CONSTRAINT "roles_modulos_modulo_id_foreign" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE;
ALTER TABLE "roles_modulos" ADD CONSTRAINT "roles_modulos_rol_id_foreign" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_foreign" FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE CASCADE;
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_foreign" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "seo_stats" ADD CONSTRAINT "seo_stats_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_contenido"("id") ON DELETE SET NULL;
ALTER TABLE "seo_stats" ADD CONSTRAINT "seo_stats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "sistema_fases_historial" ADD CONSTRAINT "sistema_fases_historial_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "sistema_fases_historial" ADD CONSTRAINT "sistema_fases_historial_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "sistema_fases_historial" ADD CONSTRAINT "sistema_fases_historial_venta_id_foreign" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE SET NULL;
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_contacto_id_foreign" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_usuario_asignado_id_foreign" FOREIGN KEY ("usuario_asignado_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tags_global" ADD CONSTRAINT "tags_global_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tags_propiedades" ADD CONSTRAINT "tags_propiedades_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "temas_tenant" ADD CONSTRAINT "temas_tenant_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tenant_api_credentials" ADD CONSTRAINT "tenant_api_credentials_connected_by_foreign" FOREIGN KEY ("connected_by") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "tenant_api_credentials" ADD CONSTRAINT "tenant_api_credentials_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tenant_catalogo_preferencias" ADD CONSTRAINT "tenant_catalogo_preferencias_catalogo_id_fkey" FOREIGN KEY ("catalogo_id") REFERENCES "catalogos"("id") ON DELETE CASCADE;
ALTER TABLE "tenant_catalogo_preferencias" ADD CONSTRAINT "tenant_catalogo_preferencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tenant_extension_preferencias" ADD CONSTRAINT "tenant_extension_preferencias_extension_id_fkey" FOREIGN KEY ("extension_id") REFERENCES "catalogo_extensiones_contacto"("id") ON DELETE CASCADE;
ALTER TABLE "tenant_extension_preferencias" ADD CONSTRAINT "tenant_extension_preferencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tenant_global_catalogo_preferencias" ADD CONSTRAINT "tenant_global_catalogo_preferencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_codigo_pais_foreign" FOREIGN KEY ("codigo_pais") REFERENCES "paises"("codigo") ON DELETE SET NULL;
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_idioma_default_foreign" FOREIGN KEY ("idioma_default") REFERENCES "idiomas"("codigo");
ALTER TABLE "tenants_features" ADD CONSTRAINT "tenants_features_feature_id_foreign" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE;
ALTER TABLE "tenants_features" ADD CONSTRAINT "tenants_features_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tenants_rutas_config_custom" ADD CONSTRAINT "tenants_rutas_config_custom_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "tenants_rutas_config_custom" ADD CONSTRAINT "tenants_rutas_config_custom_tipo_pagina_id_foreign" FOREIGN KEY ("tipo_pagina_id") REFERENCES "tipos_pagina"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "testimonios" ADD CONSTRAINT "testimonios_asesor_id_fkey" FOREIGN KEY ("asesor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "testimonios" ADD CONSTRAINT "testimonios_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_contenido"("id") ON DELETE SET NULL;
ALTER TABLE "testimonios" ADD CONSTRAINT "testimonios_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "testimonios" ADD CONSTRAINT "testimonios_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE SET NULL;
ALTER TABLE "testimonios" ADD CONSTRAINT "testimonios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ubicaciones" ADD CONSTRAINT "ubicaciones_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ubicaciones"("id") ON DELETE CASCADE;
ALTER TABLE "unidades_proyecto" ADD CONSTRAINT "unidades_proyecto_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE CASCADE;
ALTER TABLE "unidades_proyecto" ADD CONSTRAINT "unidades_proyecto_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "university_certificados" ADD CONSTRAINT "university_certificados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "university_certificados_emitidos" ADD CONSTRAINT "university_certificados_emitidos_certificado_id_fkey" FOREIGN KEY ("certificado_id") REFERENCES "university_certificados"("id") ON DELETE CASCADE;
ALTER TABLE "university_certificados_emitidos" ADD CONSTRAINT "university_certificados_emitidos_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "university_inscripciones"("id") ON DELETE CASCADE;
ALTER TABLE "university_cursos" ADD CONSTRAINT "university_cursos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "university_cursos_acceso_roles" ADD CONSTRAINT "university_cursos_acceso_roles_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "university_cursos"("id") ON DELETE CASCADE;
ALTER TABLE "university_cursos_acceso_roles" ADD CONSTRAINT "university_cursos_acceso_roles_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "university_cursos_acceso_roles" ADD CONSTRAINT "university_cursos_acceso_roles_seccion_limite_id_fkey" FOREIGN KEY ("seccion_limite_id") REFERENCES "university_secciones"("id") ON DELETE SET NULL;
ALTER TABLE "university_cursos_certificados" ADD CONSTRAINT "university_cursos_certificados_certificado_id_fkey" FOREIGN KEY ("certificado_id") REFERENCES "university_certificados"("id") ON DELETE CASCADE;
ALTER TABLE "university_cursos_certificados" ADD CONSTRAINT "university_cursos_certificados_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "university_cursos"("id") ON DELETE CASCADE;
ALTER TABLE "university_inscripciones" ADD CONSTRAINT "university_inscripciones_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "university_cursos"("id") ON DELETE CASCADE;
ALTER TABLE "university_inscripciones" ADD CONSTRAINT "university_inscripciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "university_progreso" ADD CONSTRAINT "university_progreso_inscripcion_id_fkey" FOREIGN KEY ("inscripcion_id") REFERENCES "university_inscripciones"("id") ON DELETE CASCADE;
ALTER TABLE "university_progreso" ADD CONSTRAINT "university_progreso_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "university_videos"("id") ON DELETE CASCADE;
ALTER TABLE "university_secciones" ADD CONSTRAINT "university_secciones_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "university_cursos"("id") ON DELETE CASCADE;
ALTER TABLE "university_videos" ADD CONSTRAINT "university_videos_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "university_secciones"("id") ON DELETE CASCADE;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_codigo_pais_foreign" FOREIGN KEY ("codigo_pais") REFERENCES "paises"("codigo") ON DELETE SET NULL;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_equipo_id_foreign" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE SET NULL;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_idioma_preferido_foreign" FOREIGN KEY ("idioma_preferido") REFERENCES "idiomas"("codigo");
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_oficina_id_foreign" FOREIGN KEY ("oficina_id") REFERENCES "oficinas"("id") ON DELETE SET NULL;
ALTER TABLE "usuarios_connect" ADD CONSTRAINT "usuarios_connect_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "usuarios_documentos" ADD CONSTRAINT "usuarios_documentos_subido_por_id_foreign" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "usuarios_documentos" ADD CONSTRAINT "usuarios_documentos_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "usuarios_documentos" ADD CONSTRAINT "usuarios_documentos_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_asignado_por_foreign" FOREIGN KEY ("asignado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_rol_id_foreign" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE;
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "usuarios_tenants" ADD CONSTRAINT "usuarios_tenants_nivel_productividad_id_foreign" FOREIGN KEY ("nivel_productividad_id") REFERENCES "niveles_productividad"("id") ON DELETE SET NULL;
ALTER TABLE "usuarios_tenants" ADD CONSTRAINT "usuarios_tenants_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "usuarios_tenants" ADD CONSTRAINT "usuarios_tenants_usuario_id_foreign" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cancelado_por_id_foreign" FOREIGN KEY ("cancelado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_captador_id_fkey" FOREIGN KEY ("captador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_contacto_id_foreign" FOREIGN KEY ("contacto_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_equipo_id_foreign" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_estado_venta_id_foreign" FOREIGN KEY ("estado_venta_id") REFERENCES "estados_venta"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_perfil_asesor_id_foreign" FOREIGN KEY ("perfil_asesor_id") REFERENCES "perfiles_asesor"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_propiedad_id_foreign" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_referidor_contacto_id_foreign" FOREIGN KEY ("referidor_contacto_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_referidor_id_foreign" FOREIGN KEY ("referidor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_tenant_id_foreign" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuario_cerrador_id_foreign" FOREIGN KEY ("usuario_cerrador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedor_externo_id_foreign" FOREIGN KEY ("vendedor_externo_id") REFERENCES "contactos"("id") ON DELETE SET NULL;
ALTER TABLE "ventas_cobros" ADD CONSTRAINT "ventas_cobros_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "ventas_cobros" ADD CONSTRAINT "ventas_cobros_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ventas_cobros" ADD CONSTRAINT "ventas_cobros_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE;
ALTER TABLE "ventas_historial" ADD CONSTRAINT "ventas_historial_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
ALTER TABLE "ventas_historial" ADD CONSTRAINT "ventas_historial_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "ventas_historial" ADD CONSTRAINT "ventas_historial_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE;
ALTER TABLE "videos" ADD CONSTRAINT "videos_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL;
ALTER TABLE "videos" ADD CONSTRAINT "videos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_contenido"("id") ON DELETE SET NULL;
ALTER TABLE "videos" ADD CONSTRAINT "videos_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedades"("id") ON DELETE SET NULL;
ALTER TABLE "videos" ADD CONSTRAINT "videos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX "actividades_crm_pkey" ON "actividades_crm" ("id");
CREATE INDEX "idx_actividades_contacto" ON "actividades_crm" ("contacto_id");
CREATE INDEX "idx_actividades_estado" ON "actividades_crm" ("estado");
CREATE INDEX "idx_actividades_fecha" ON "actividades_crm" ("fecha_actividad");
CREATE INDEX "idx_actividades_prioridad" ON "actividades_crm" ("prioridad");
CREATE INDEX "idx_actividades_solicitud" ON "actividades_crm" ("solicitud_id");
CREATE INDEX "idx_actividades_tenant" ON "actividades_crm" ("tenant_id");
CREATE INDEX "idx_actividades_tipo" ON "actividades_crm" ("tipo");
CREATE UNIQUE INDEX "amenidades_codigo_unique" ON "amenidades" ("codigo");
CREATE UNIQUE INDEX "amenidades_pkey" ON "amenidades" ("id");
CREATE INDEX "idx_amenidades_activo" ON "amenidades" ("activo");
CREATE INDEX "idx_amenidades_categoria" ON "amenidades" ("categoria");
CREATE INDEX "idx_amenidades_codigo" ON "amenidades" ("codigo");
CREATE UNIQUE INDEX "api_usage_logs_pkey" ON "api_usage_logs" ("id");
CREATE INDEX "idx_api_usage_date" ON "api_usage_logs" ("created_at");
CREATE INDEX "idx_api_usage_tenant_provider_date" ON "api_usage_logs" ("tenant_id","api_provider","created_at");
CREATE UNIQUE INDEX "articulos_pkey" ON "articulos" ("id");
CREATE UNIQUE INDEX "articulos_tenant_id_slug_key" ON "articulos" ("tenant_id","slug");
CREATE INDEX "idx_articulos_categoria" ON "articulos" ("categoria_id");
CREATE INDEX "idx_articulos_destacado" ON "articulos" ("destacado");
CREATE INDEX "idx_articulos_publicado" ON "articulos" ("publicado","fecha_publicacion");
CREATE INDEX "idx_articulos_tenant" ON "articulos" ("tenant_id");
CREATE UNIQUE INDEX "asesor_social_accounts_pkey" ON "asesor_social_accounts" ("id");
CREATE INDEX "idx_asesor_social_active" ON "asesor_social_accounts" ("is_active");
CREATE INDEX "idx_asesor_social_tenant_platform" ON "asesor_social_accounts" ("tenant_id","platform");
CREATE UNIQUE INDEX "uq_asesor_social_account_platform" ON "asesor_social_accounts" ("usuario_id","platform");
CREATE UNIQUE INDEX "cat_monedas_pkey" ON "cat_monedas" ("codigo");
CREATE INDEX "idx_cat_monedas_activo" ON "cat_monedas" ("activo");
CREATE INDEX "idx_cat_monedas_orden" ON "cat_monedas" ("orden");
CREATE UNIQUE INDEX "catalogo_componentes_pkey" ON "catalogo_componentes" ("id");
CREATE INDEX "idx_catalogo_componentes_active" ON "catalogo_componentes" ("active");
CREATE INDEX "idx_catalogo_componentes_key" ON "catalogo_componentes" ("componente_key");
CREATE UNIQUE INDEX "uq_catalogo_componentes_key" ON "catalogo_componentes" ("componente_key");
CREATE UNIQUE INDEX "catalogo_extensiones_contacto_pkey" ON "catalogo_extensiones_contacto" ("id");
CREATE UNIQUE INDEX "catalogo_extensiones_contacto_tenant_id_codigo_key" ON "catalogo_extensiones_contacto" ("tenant_id","codigo");
CREATE INDEX "idx_cat_ext_contacto_activo" ON "catalogo_extensiones_contacto" ("activo");
CREATE INDEX "idx_cat_ext_contacto_codigo" ON "catalogo_extensiones_contacto" ("codigo");
CREATE INDEX "idx_cat_ext_contacto_tenant" ON "catalogo_extensiones_contacto" ("tenant_id");
CREATE UNIQUE INDEX "catalogos_pkey" ON "catalogos" ("id");
CREATE UNIQUE INDEX "catalogos_tenant_id_tipo_codigo_key" ON "catalogos" ("tenant_id","tipo","codigo");
CREATE INDEX "idx_catalogos_tenant_tipo" ON "catalogos" ("tenant_id","tipo");
CREATE INDEX "idx_catalogos_tipo_activo" ON "catalogos" ("tipo","activo");
CREATE INDEX "idx_catalogos_tipo_codigo" ON "catalogos" ("tipo","codigo");
CREATE UNIQUE INDEX "categorias_contenido_pkey" ON "categorias_contenido" ("id");
CREATE UNIQUE INDEX "categorias_contenido_tenant_id_slug_tipo_key" ON "categorias_contenido" ("tenant_id","slug","tipo");
CREATE INDEX "idx_categorias_contenido_tenant" ON "categorias_contenido" ("tenant_id");
CREATE INDEX "idx_categorias_contenido_tipo" ON "categorias_contenido" ("tipo");
CREATE UNIQUE INDEX "categorias_propiedades_pkey" ON "categorias_propiedades" ("id");
CREATE UNIQUE INDEX "categorias_propiedades_slug_unique" ON "categorias_propiedades" ("slug");
CREATE INDEX "idx_categorias_propiedades_activo" ON "categorias_propiedades" ("activo");
CREATE INDEX "idx_categorias_propiedades_slug" ON "categorias_propiedades" ("slug");
CREATE UNIQUE INDEX "clic_connect_join_requests_pkey" ON "clic_connect_join_requests" ("id");
CREATE INDEX "idx_join_requests_email" ON "clic_connect_join_requests" ("email");
CREATE INDEX "idx_join_requests_estado" ON "clic_connect_join_requests" ("estado");
CREATE INDEX "idx_join_requests_referido" ON "clic_connect_join_requests" ("codigo_referido");
CREATE INDEX "idx_join_requests_tenant" ON "clic_connect_join_requests" ("tenant_id");
CREATE UNIQUE INDEX "clic_connect_upgrade_requests_pkey" ON "clic_connect_upgrade_requests" ("id");
CREATE INDEX "idx_upgrade_requests_estado" ON "clic_connect_upgrade_requests" ("estado");
CREATE INDEX "idx_upgrade_requests_tenant" ON "clic_connect_upgrade_requests" ("tenant_id");
CREATE INDEX "idx_upgrade_requests_tipo" ON "clic_connect_upgrade_requests" ("tipo_solicitud");
CREATE INDEX "idx_upgrade_requests_usuario" ON "clic_connect_upgrade_requests" ("usuario_id");
CREATE UNIQUE INDEX "comisiones_pkey" ON "comisiones" ("id");
CREATE INDEX "idx_comisiones_escenario" ON "comisiones" ("escenario");
CREATE INDEX "idx_comisiones_estado" ON "comisiones" ("estado");
CREATE INDEX "idx_comisiones_fecha_pago" ON "comisiones" ("fecha_pago");
CREATE INDEX "idx_comisiones_tenant" ON "comisiones" ("tenant_id");
CREATE INDEX "idx_comisiones_tipo_participante" ON "comisiones" ("tipo_participante");
CREATE INDEX "idx_comisiones_usuario" ON "comisiones" ("usuario_id");
CREATE INDEX "idx_comisiones_venta" ON "comisiones" ("venta_id");
CREATE UNIQUE INDEX "componentes_features_pkey" ON "componentes_features" ("id");
CREATE INDEX "idx_componentes_features_componente" ON "componentes_features" ("componente_id");
CREATE INDEX "idx_componentes_features_feature" ON "componentes_features" ("feature_id");
CREATE UNIQUE INDEX "unique_componente_feature" ON "componentes_features" ("componente_id","feature_id");
CREATE UNIQUE INDEX "componentes_web_pkey" ON "componentes_web" ("id");
CREATE INDEX "idx_componentes_web_catalogo" ON "componentes_web" ("componente_catalogo_id");
CREATE INDEX "idx_componentes_web_rutas_custom" ON "componentes_web" ("tenant_rutas_config_custom_id");
CREATE INDEX "idx_componentes_web_tenant" ON "componentes_web" ("tenant_id");
CREATE INDEX "idx_componentes_web_tenant_activo" ON "componentes_web" ("tenant_id","activo");
CREATE INDEX "idx_componentes_web_tenant_orden" ON "componentes_web" ("tenant_id","orden");
CREATE INDEX "idx_componentes_web_tipo_pagina" ON "componentes_web" ("tipo_pagina_id");
CREATE UNIQUE INDEX "config_productividad_pkey" ON "config_productividad" ("id");
CREATE UNIQUE INDEX "config_productividad_tenant_id_unique" ON "config_productividad" ("tenant_id");
CREATE UNIQUE INDEX "config_sistema_fases_pkey" ON "config_sistema_fases" ("id");
CREATE UNIQUE INDEX "config_sistema_fases_tenant_id_unique" ON "config_sistema_fases" ("tenant_id");
CREATE UNIQUE INDEX "contacto_extensiones_contacto_id_extension_id_key" ON "contacto_extensiones" ("contacto_id","extension_id");
CREATE UNIQUE INDEX "contacto_extensiones_pkey" ON "contacto_extensiones" ("id");
CREATE INDEX "idx_contacto_ext_contacto" ON "contacto_extensiones" ("contacto_id");
CREATE INDEX "idx_contacto_ext_extension" ON "contacto_extensiones" ("extension_id");
CREATE INDEX "idx_contacto_ext_tenant" ON "contacto_extensiones" ("tenant_id");
CREATE UNIQUE INDEX "contactos_pkey" ON "contactos" ("id");
CREATE INDEX "idx_contactos_email" ON "contactos" ("email");
CREATE INDEX "idx_contactos_favorito" ON "contactos" ("favorito");
CREATE INDEX "idx_contactos_tenant" ON "contactos" ("tenant_id");
CREATE INDEX "idx_contactos_tipo" ON "contactos" ("tipo");
CREATE INDEX "idx_contactos_usuario" ON "contactos" ("usuario_asignado_id");
CREATE UNIQUE INDEX "contactos_connect_pkey" ON "contactos_connect" ("id");
CREATE INDEX "idx_contactos_connect_tenant" ON "contactos_connect" ("tenant_id");
CREATE INDEX "idx_contactos_connect_usuario" ON "contactos_connect" ("usuario_connect_id");
CREATE UNIQUE INDEX "contactos_relaciones_pkey" ON "contactos_relaciones" ("id");
CREATE INDEX "idx_contactos_rel_destino" ON "contactos_relaciones" ("contacto_destino_id");
CREATE INDEX "idx_contactos_rel_origen" ON "contactos_relaciones" ("contacto_origen_id");
CREATE INDEX "idx_contactos_rel_tenant" ON "contactos_relaciones" ("tenant_id");
CREATE UNIQUE INDEX "idx_contactos_rel_unique" ON "contactos_relaciones" ("contacto_origen_id","contacto_destino_id","tipo_relacion");
CREATE UNIQUE INDEX "contenido_relaciones_pkey" ON "contenido_relaciones" ("id");
CREATE UNIQUE INDEX "contenido_relaciones_tenant_id_tipo_origen_id_origen_tipo_d_key" ON "contenido_relaciones" ("tenant_id","tipo_origen","id_origen","tipo_destino","id_destino");
CREATE INDEX "idx_contenido_relaciones_activa" ON "contenido_relaciones" ("activa");
CREATE INDEX "idx_contenido_relaciones_destino" ON "contenido_relaciones" ("tipo_destino","id_destino");
CREATE INDEX "idx_contenido_relaciones_origen" ON "contenido_relaciones" ("tipo_origen","id_origen");
CREATE INDEX "idx_contenido_relaciones_tenant" ON "contenido_relaciones" ("tenant_id");
CREATE UNIQUE INDEX "content_tags_pkey" ON "content_tags" ("id");
CREATE UNIQUE INDEX "content_tags_tenant_id_tipo_contenido_contenido_id_tag_id_key" ON "content_tags" ("tenant_id","tipo_contenido","contenido_id","tag_id");
CREATE INDEX "idx_content_tags_contenido" ON "content_tags" ("tipo_contenido","contenido_id");
CREATE INDEX "idx_content_tags_full" ON "content_tags" ("tenant_id","tipo_contenido","contenido_id");
CREATE INDEX "idx_content_tags_tag" ON "content_tags" ("tag_id");
CREATE INDEX "idx_content_tags_tenant" ON "content_tags" ("tenant_id");
CREATE INDEX "idx_expediente_req_activo" ON "documentos_requeridos" ("activo");
CREATE INDEX "idx_expediente_req_categoria" ON "documentos_requeridos" ("categoria");
CREATE INDEX "idx_expediente_req_orden" ON "documentos_requeridos" ("orden_visualizacion");
CREATE INDEX "idx_expediente_req_tenant" ON "documentos_requeridos" ("tenant_id");
CREATE UNIQUE INDEX "ventas_expediente_requerimientos_pkey" ON "documentos_requeridos" ("id");
CREATE INDEX "idx_expediente_items_estado" ON "documentos_subidos" ("estado");
CREATE INDEX "idx_expediente_items_req" ON "documentos_subidos" ("requerimiento_id");
CREATE INDEX "idx_expediente_items_subido" ON "documentos_subidos" ("subido_por_id");
CREATE INDEX "idx_expediente_items_tenant" ON "documentos_subidos" ("tenant_id");
CREATE INDEX "idx_expediente_items_venta" ON "documentos_subidos" ("venta_id");
CREATE UNIQUE INDEX "uq_expediente_items_venta_req" ON "documentos_subidos" ("venta_id","requerimiento_id");
CREATE UNIQUE INDEX "ventas_expediente_items_pkey" ON "documentos_subidos" ("id");
CREATE UNIQUE INDEX "equipos_pkey" ON "equipos" ("id");
CREATE INDEX "equipos_tenant_id_activo_index" ON "equipos" ("tenant_id","activo");
CREATE UNIQUE INDEX "equipos_tenant_id_slug_unique" ON "equipos" ("tenant_id","slug");
CREATE INDEX "equipos_miembros_equipo_id_index" ON "equipos_miembros" ("equipo_id");
CREATE UNIQUE INDEX "equipos_miembros_equipo_id_usuario_id_unique" ON "equipos_miembros" ("equipo_id","usuario_id");
CREATE UNIQUE INDEX "equipos_miembros_pkey" ON "equipos_miembros" ("id");
CREATE INDEX "equipos_miembros_usuario_id_index" ON "equipos_miembros" ("usuario_id");
CREATE UNIQUE INDEX "estados_venta_pkey" ON "estados_venta" ("id");
CREATE INDEX "idx_estados_venta_final" ON "estados_venta" ("es_final");
CREATE INDEX "idx_estados_venta_tenant" ON "estados_venta" ("tenant_id");
CREATE UNIQUE INDEX "facturas_numero_factura_unique" ON "facturas" ("numero_factura");
CREATE UNIQUE INDEX "facturas_pkey" ON "facturas" ("id");
CREATE INDEX "idx_facturas_estado" ON "facturas" ("estado");
CREATE INDEX "idx_facturas_fecha_emision" ON "facturas" ("fecha_emision");
CREATE INDEX "idx_facturas_numero" ON "facturas" ("numero_factura");
CREATE INDEX "idx_facturas_tenant" ON "facturas" ("tenant_id");
CREATE UNIQUE INDEX "faqs_pkey" ON "faqs" ("id");
CREATE INDEX "idx_faqs_categoria" ON "faqs" ("categoria_id");
CREATE INDEX "idx_faqs_contexto" ON "faqs" ("contexto");
CREATE INDEX "idx_faqs_publicado" ON "faqs" ("publicado","orden");
CREATE INDEX "idx_faqs_tenant" ON "faqs" ("tenant_id");
CREATE UNIQUE INDEX "features_pkey" ON "features" ("id");
CREATE INDEX "idx_features_category" ON "features" ("category");
CREATE INDEX "idx_features_is_premium" ON "features" ("is_premium");
CREATE INDEX "idx_features_is_public" ON "features" ("is_public");
CREATE UNIQUE INDEX "idiomas_pkey" ON "idiomas" ("codigo");
CREATE INDEX "idx_interacciones_connect_fecha" ON "interacciones_connect" ("created_at");
CREATE INDEX "idx_interacciones_connect_tenant" ON "interacciones_connect" ("tenant_id");
CREATE INDEX "idx_interacciones_connect_tipo" ON "interacciones_connect" ("tipo");
CREATE INDEX "idx_interacciones_connect_usuario" ON "interacciones_connect" ("usuario_connect_id");
CREATE UNIQUE INDEX "interacciones_connect_pkey" ON "interacciones_connect" ("id");
CREATE UNIQUE INDEX "knex_migrations_pkey" ON "knex_migrations" ("id");
CREATE UNIQUE INDEX "knex_migrations_lock_pkey" ON "knex_migrations_lock" ("index");
CREATE INDEX "idx_layout_configs_activa" ON "layout_configs" ("activa","es_default");
CREATE INDEX "idx_layout_configs_alcance" ON "layout_configs" ("tipo_alcance","alcance_id");
CREATE UNIQUE INDEX "idx_layout_configs_default_per_scope" ON "layout_configs" ("tenant_id","tipo_alcance","alcance_id");
CREATE INDEX "idx_layout_configs_tenant" ON "layout_configs" ("tenant_id");
CREATE UNIQUE INDEX "layout_configs_pkey" ON "layout_configs" ("id");
CREATE INDEX "idx_metas_estado" ON "metas" ("estado");
CREATE INDEX "idx_metas_fecha_fin" ON "metas" ("fecha_fin");
CREATE INDEX "idx_metas_tenant" ON "metas" ("tenant_id");
CREATE INDEX "idx_metas_tipo" ON "metas" ("tipo_meta");
CREATE INDEX "idx_metas_usuario" ON "metas" ("usuario_id");
CREATE UNIQUE INDEX "metas_pkey" ON "metas" ("id");
CREATE INDEX "idx_mock_articulos_categoria" ON "mock_articulos" ("categoria_id");
CREATE INDEX "idx_mock_articulos_tenant_activo" ON "mock_articulos" ("tenant_id","activo");
CREATE UNIQUE INDEX "mock_articulos_pkey" ON "mock_articulos" ("id");
CREATE INDEX "idx_mock_asesores_tenant_activo" ON "mock_asesores" ("tenant_id","activo");
CREATE UNIQUE INDEX "mock_asesores_pkey" ON "mock_asesores" ("id");
CREATE INDEX "idx_mock_carruseles_tenant_slug" ON "mock_carruseles_propiedades" ("tenant_id","slug");
CREATE UNIQUE INDEX "mock_carruseles_propiedades_pkey" ON "mock_carruseles_propiedades" ("id");
CREATE INDEX "idx_mock_categorias_tenant_activa" ON "mock_categorias_contenido" ("tenant_id","activa");
CREATE INDEX "idx_mock_categorias_tenant_tipo" ON "mock_categorias_contenido" ("tenant_id","tipo_contenido");
CREATE UNIQUE INDEX "mock_categorias_contenido_pkey" ON "mock_categorias_contenido" ("id");
CREATE INDEX "idx_mock_faqs_tenant_activo" ON "mock_faqs" ("tenant_id","activo");
CREATE INDEX "idx_mock_faqs_tenant_categoria" ON "mock_faqs" ("tenant_id","categoria");
CREATE UNIQUE INDEX "mock_faqs_pkey" ON "mock_faqs" ("id");
CREATE INDEX "idx_mock_stats_tenant" ON "mock_stats" ("tenant_id");
CREATE UNIQUE INDEX "mock_stats_pkey" ON "mock_stats" ("id");
CREATE INDEX "idx_mock_testimonios_categoria" ON "mock_testimonios" ("categoria_id");
CREATE INDEX "idx_mock_testimonios_tenant_activo" ON "mock_testimonios" ("tenant_id","activo");
CREATE UNIQUE INDEX "mock_testimonios_pkey" ON "mock_testimonios" ("id");
CREATE UNIQUE INDEX "idx_mock_textos_tenant_clave" ON "mock_textos_sueltos" ("tenant_id","clave");
CREATE UNIQUE INDEX "mock_textos_sueltos_pkey" ON "mock_textos_sueltos" ("id");
CREATE INDEX "idx_mock_videos_categoria" ON "mock_videos" ("categoria_id");
CREATE INDEX "idx_mock_videos_tenant_activo" ON "mock_videos" ("tenant_id","activo");
CREATE UNIQUE INDEX "mock_videos_pkey" ON "mock_videos" ("id");
CREATE INDEX "idx_modulos_categoria" ON "modulos" ("categoria");
CREATE UNIQUE INDEX "modulos_pkey" ON "modulos" ("id");
CREATE INDEX "idx_niveles_productividad_tenant_activo" ON "niveles_productividad" ("tenant_id","activo");
CREATE UNIQUE INDEX "niveles_productividad_pkey" ON "niveles_productividad" ("id");
CREATE UNIQUE INDEX "uq_niveles_productividad_tenant_codigo" ON "niveles_productividad" ("tenant_id","codigo");
CREATE INDEX "oficinas_activo_index" ON "oficinas" ("activo");
CREATE INDEX "oficinas_administrador_id_index" ON "oficinas" ("administrador_id");
CREATE UNIQUE INDEX "oficinas_pkey" ON "oficinas" ("id");
CREATE INDEX "oficinas_tenant_id_index" ON "oficinas" ("tenant_id");
CREATE INDEX "idx_operaciones_activo" ON "operaciones" ("activo");
CREATE INDEX "idx_operaciones_slug" ON "operaciones" ("slug");
CREATE UNIQUE INDEX "operaciones_pkey" ON "operaciones" ("id");
CREATE UNIQUE INDEX "operaciones_slug_unique" ON "operaciones" ("slug");
CREATE INDEX "idx_pagos_comisiones_comision" ON "pagos_comisiones" ("comision_id");
CREATE INDEX "idx_pagos_comisiones_fecha_pago" ON "pagos_comisiones" ("fecha_pago");
CREATE INDEX "idx_pagos_comisiones_fecha_registro" ON "pagos_comisiones" ("fecha_registro");
CREATE INDEX "idx_pagos_comisiones_tenant" ON "pagos_comisiones" ("tenant_id");
CREATE INDEX "idx_pagos_comisiones_tipo_pago" ON "pagos_comisiones" ("tipo_pago");
CREATE INDEX "idx_pagos_comisiones_venta" ON "pagos_comisiones" ("venta_id");
CREATE UNIQUE INDEX "pagos_comisiones_pkey" ON "pagos_comisiones" ("id");
CREATE UNIQUE INDEX "paises_pkey" ON "paises" ("codigo");
CREATE UNIQUE INDEX "perfiles_asesor_pkey" ON "perfiles_asesor" ("id");
CREATE INDEX "perfiles_asesor_tenant_id_activo_visible_en_web_index" ON "perfiles_asesor" ("tenant_id","activo","visible_en_web");
CREATE INDEX "perfiles_asesor_tenant_id_destacado_index" ON "perfiles_asesor" ("tenant_id","destacado");
CREATE INDEX "perfiles_asesor_tenant_id_equipo_id_index" ON "perfiles_asesor" ("tenant_id","equipo_id");
CREATE INDEX "perfiles_asesor_tenant_id_rango_index" ON "perfiles_asesor" ("tenant_id","rango");
CREATE UNIQUE INDEX "perfiles_asesor_tenant_id_slug_unique" ON "perfiles_asesor" ("tenant_id","slug");
CREATE UNIQUE INDEX "perfiles_asesor_tenant_id_usuario_id_unique" ON "perfiles_asesor" ("tenant_id","usuario_id");
CREATE INDEX "idx_permisos_codigo" ON "permisos" ("codigo");
CREATE INDEX "idx_permisos_recurso" ON "permisos" ("recurso");
CREATE UNIQUE INDEX "permisos_codigo_unique" ON "permisos" ("codigo");
CREATE UNIQUE INDEX "permisos_pkey" ON "permisos" ("id");
CREATE INDEX "idx_plantillas_componente" ON "plantillas_pagina" ("componente_catalogo_id");
CREATE INDEX "idx_plantillas_tipo_pagina" ON "plantillas_pagina" ("tipo_pagina_id");
CREATE UNIQUE INDEX "plantillas_pagina_pkey" ON "plantillas_pagina" ("id");
CREATE UNIQUE INDEX "unique_tipo_pagina_componente" ON "plantillas_pagina" ("tipo_pagina_id","componente_catalogo_id");
CREATE INDEX "idx_platform_config_categoria" ON "platform_config" ("categoria");
CREATE UNIQUE INDEX "platform_config_pkey" ON "platform_config" ("clave");
CREATE INDEX "idx_productividad_metas_tenant_periodo" ON "productividad_metas_usuario" ("tenant_id","periodo");
CREATE UNIQUE INDEX "productividad_metas_usuario_pkey" ON "productividad_metas_usuario" ("id");
CREATE UNIQUE INDEX "uq_productividad_metas_periodo" ON "productividad_metas_usuario" ("tenant_id","usuario_id","periodo");
CREATE INDEX "idx_productividad_resumen_periodo" ON "productividad_resumen" ("tenant_id","periodo");
CREATE INDEX "idx_productividad_resumen_usuario" ON "productividad_resumen" ("usuario_id","periodo");
CREATE UNIQUE INDEX "productividad_resumen_pkey" ON "productividad_resumen" ("id");
CREATE UNIQUE INDEX "uq_productividad_resumen" ON "productividad_resumen" ("tenant_id","usuario_id","periodo","tipo_periodo","semana");
CREATE INDEX "idx_propiedades_agente" ON "propiedades" ("agente_id");
CREATE INDEX "idx_propiedades_captador" ON "propiedades" ("captador_id");
CREATE INDEX "idx_propiedades_desarrollador" ON "propiedades" ("desarrollador_id");
CREATE INDEX "idx_propiedades_destacada" ON "propiedades" ("destacada");
CREATE INDEX "idx_propiedades_estado" ON "propiedades" ("estado_propiedad");
CREATE INDEX "idx_propiedades_etiquetas" ON "propiedades" USING gin ("etiquetas");
CREATE INDEX "idx_propiedades_external_id" ON "propiedades" ("external_id");
CREATE INDEX "idx_propiedades_external_source" ON "propiedades" ("external_source");
CREATE UNIQUE INDEX "idx_propiedades_external_unique" ON "propiedades" ("tenant_id","external_source","external_id");
CREATE INDEX "idx_propiedades_is_project" ON "propiedades" ("is_project");
CREATE INDEX "idx_propiedades_location" ON "propiedades" ("provincia","ciudad","sector");
CREATE INDEX "idx_propiedades_operacion" ON "propiedades" ("operacion");
CREATE INDEX "idx_propiedades_precio" ON "propiedades" ("precio");
CREATE INDEX "idx_propiedades_provincia" ON "propiedades" ("provincia");
CREATE INDEX "idx_propiedades_publicada" ON "propiedades" ("publicada");
CREATE INDEX "idx_propiedades_sector" ON "propiedades" ("sector");
CREATE INDEX "idx_propiedades_tenant" ON "propiedades" ("tenant_id");
CREATE UNIQUE INDEX "idx_propiedades_tenant_codigo" ON "propiedades" ("tenant_id","codigo");
CREATE UNIQUE INDEX "idx_propiedades_tenant_codigo_publico" ON "propiedades" ("tenant_id","codigo_publico");
CREATE INDEX "idx_propiedades_tipo" ON "propiedades" ("tipo");
CREATE INDEX "idx_propiedades_ubicacion_id" ON "propiedades" ("ubicacion_id");
CREATE UNIQUE INDEX "propiedades_pkey" ON "propiedades" ("id");
CREATE INDEX "idx_propiedades_connect_acceso_propiedad" ON "propiedades_connect_acceso" ("propiedad_id");
CREATE UNIQUE INDEX "idx_propiedades_connect_acceso_unique" ON "propiedades_connect_acceso" ("usuario_connect_id","propiedad_id","tipo_acceso");
CREATE INDEX "idx_propiedades_connect_acceso_usuario" ON "propiedades_connect_acceso" ("usuario_connect_id");
CREATE UNIQUE INDEX "propiedades_connect_acceso_pkey" ON "propiedades_connect_acceso" ("id");
CREATE INDEX "idx_propuestas_contacto" ON "propuestas" ("contacto_id");
CREATE INDEX "idx_propuestas_estado" ON "propuestas" ("estado");
CREATE INDEX "idx_propuestas_solicitud" ON "propuestas" ("solicitud_id");
CREATE INDEX "idx_propuestas_tenant" ON "propuestas" ("tenant_id");
CREATE INDEX "idx_propuestas_url" ON "propuestas" ("url_publica");
CREATE UNIQUE INDEX "propuestas_pkey" ON "propuestas" ("id");
CREATE UNIQUE INDEX "propuestas_url_publica_unique" ON "propuestas" ("url_publica");
CREATE INDEX "idx_propuestas_propiedades_propiedad" ON "propuestas_propiedades" ("propiedad_id");
CREATE INDEX "idx_propuestas_propiedades_propuesta" ON "propuestas_propiedades" ("propuesta_id");
CREATE UNIQUE INDEX "propuestas_propiedades_pkey" ON "propuestas_propiedades" ("id");
CREATE UNIQUE INDEX "propuestas_propiedades_propuesta_id_propiedad_id_key" ON "propuestas_propiedades" ("propuesta_id","propiedad_id");
CREATE INDEX "idx_roles_codigo" ON "roles" ("codigo");
CREATE INDEX "idx_roles_feature_requerido" ON "roles" ("feature_requerido");
CREATE INDEX "idx_roles_tenant_id" ON "roles" ("tenant_id");
CREATE INDEX "idx_roles_tipo" ON "roles" ("tipo");
CREATE INDEX "idx_roles_visible" ON "roles" ("visible");
CREATE UNIQUE INDEX "roles_codigo_unique" ON "roles" ("codigo");
CREATE UNIQUE INDEX "roles_pkey" ON "roles" ("id");
CREATE UNIQUE INDEX "idx_roles_modulos_unique" ON "roles_modulos" ("rol_id","modulo_id");
CREATE UNIQUE INDEX "roles_modulos_pkey" ON "roles_modulos" ("id");
CREATE UNIQUE INDEX "roles_permisos_pkey" ON "roles_permisos" ("rol_id","permiso_id");
CREATE INDEX "idx_seo_stats_categoria" ON "seo_stats" ("categoria_id");
CREATE INDEX "idx_seo_stats_operaciones" ON "seo_stats" USING gin ("operaciones");
CREATE INDEX "idx_seo_stats_publicado" ON "seo_stats" ("publicado","orden");
CREATE INDEX "idx_seo_stats_tenant" ON "seo_stats" ("tenant_id");
CREATE INDEX "idx_seo_stats_tipo_propiedad_ids" ON "seo_stats" USING gin ("tipo_propiedad_ids");
CREATE INDEX "idx_seo_stats_ubicacion_ids" ON "seo_stats" USING gin ("ubicacion_ids");
CREATE UNIQUE INDEX "seo_stats_pkey" ON "seo_stats" ("id");
CREATE UNIQUE INDEX "seo_stats_tenant_id_slug_key" ON "seo_stats" ("tenant_id","slug");
CREATE INDEX "idx_fases_historial_fecha" ON "sistema_fases_historial" ("created_at");
CREATE INDEX "idx_fases_historial_tenant_usuario" ON "sistema_fases_historial" ("tenant_id","usuario_id");
CREATE UNIQUE INDEX "sistema_fases_historial_pkey" ON "sistema_fases_historial" ("id");
CREATE INDEX "idx_solicitudes_contacto" ON "solicitudes" ("contacto_id");
CREATE INDEX "idx_solicitudes_etapa" ON "solicitudes" ("etapa");
CREATE INDEX "idx_solicitudes_propiedad" ON "solicitudes" ("propiedad_id");
CREATE INDEX "idx_solicitudes_tenant" ON "solicitudes" ("tenant_id");
CREATE INDEX "idx_solicitudes_usuario" ON "solicitudes" ("usuario_asignado_id");
CREATE UNIQUE INDEX "solicitudes_pkey" ON "solicitudes" ("id");
CREATE INDEX "idx_suscripciones_estado" ON "suscripciones" ("estado");
CREATE INDEX "idx_suscripciones_proximo_cobro" ON "suscripciones" ("proximo_cobro");
CREATE UNIQUE INDEX "idx_suscripciones_tenant_unique" ON "suscripciones" ("tenant_id");
CREATE UNIQUE INDEX "suscripciones_pkey" ON "suscripciones" ("id");
CREATE INDEX "idx_tags_global_activo" ON "tags_global" ("activo");
CREATE INDEX "idx_tags_global_categoria" ON "tags_global" ("categoria");
CREATE INDEX "idx_tags_global_slug" ON "tags_global" ("slug");
CREATE INDEX "idx_tags_global_tenant" ON "tags_global" ("tenant_id");
CREATE UNIQUE INDEX "tags_global_pkey" ON "tags_global" ("id");
CREATE UNIQUE INDEX "tags_global_tenant_id_slug_key" ON "tags_global" ("tenant_id","slug");
CREATE INDEX "idx_tags_propiedades_activo" ON "tags_propiedades" ("activo");
CREATE INDEX "idx_tags_propiedades_slug" ON "tags_propiedades" ("slug");
CREATE INDEX "idx_tags_propiedades_tenant" ON "tags_propiedades" ("tenant_id");
CREATE INDEX "idx_tags_propiedades_tipo" ON "tags_propiedades" ("tipo");
CREATE UNIQUE INDEX "tags_propiedades_pkey" ON "tags_propiedades" ("id");
CREATE INDEX "idx_temas_tenant_id" ON "temas_tenant" ("tenant_id");
CREATE UNIQUE INDEX "temas_tenant_pkey" ON "temas_tenant" ("id");
CREATE UNIQUE INDEX "temas_tenant_tenant_id_unique" ON "temas_tenant" ("tenant_id");
CREATE INDEX "idx_tenant_api_email_connected" ON "tenant_api_credentials" ("email_connected");
CREATE INDEX "idx_tenant_api_gsc_connected" ON "tenant_api_credentials" ("google_search_console_connected");
CREATE INDEX "idx_tenant_api_meta_connected" ON "tenant_api_credentials" ("meta_connected");
CREATE UNIQUE INDEX "tenant_api_credentials_pkey" ON "tenant_api_credentials" ("id");
CREATE UNIQUE INDEX "uq_tenant_api_credentials_tenant" ON "tenant_api_credentials" ("tenant_id");
CREATE INDEX "idx_tenant_catalogo_pref_catalogo" ON "tenant_catalogo_preferencias" ("catalogo_id");
CREATE INDEX "idx_tenant_catalogo_pref_tenant" ON "tenant_catalogo_preferencias" ("tenant_id");
CREATE UNIQUE INDEX "tenant_catalogo_preferencias_pkey" ON "tenant_catalogo_preferencias" ("id");
CREATE UNIQUE INDEX "tenant_catalogo_preferencias_tenant_id_catalogo_id_key" ON "tenant_catalogo_preferencias" ("tenant_id","catalogo_id");
CREATE INDEX "idx_tenant_ext_pref_tenant" ON "tenant_extension_preferencias" ("tenant_id");
CREATE UNIQUE INDEX "tenant_extension_preferencias_pkey" ON "tenant_extension_preferencias" ("id");
CREATE UNIQUE INDEX "tenant_extension_preferencias_tenant_id_extension_id_key" ON "tenant_extension_preferencias" ("tenant_id","extension_id");
CREATE INDEX "idx_tenant_global_pref_item" ON "tenant_global_catalogo_preferencias" ("item_id");
CREATE INDEX "idx_tenant_global_pref_tabla" ON "tenant_global_catalogo_preferencias" ("tabla");
CREATE INDEX "idx_tenant_global_pref_tenant" ON "tenant_global_catalogo_preferencias" ("tenant_id");
CREATE UNIQUE INDEX "tenant_global_catalogo_preferencias_pkey" ON "tenant_global_catalogo_preferencias" ("id");
CREATE UNIQUE INDEX "uq_tenant_global_pref" ON "tenant_global_catalogo_preferencias" ("tenant_id","tabla","item_id");
CREATE INDEX "idx_tenants_dominio_personalizado" ON "tenants" ("dominio_personalizado");
CREATE INDEX "idx_tenants_pais" ON "tenants" ("codigo_pais");
CREATE INDEX "idx_tenants_plan" ON "tenants" ("plan");
CREATE INDEX "idx_tenants_slug" ON "tenants" ("slug");
CREATE UNIQUE INDEX "tenants_dominio_personalizado_unique" ON "tenants" ("dominio_personalizado");
CREATE UNIQUE INDEX "tenants_pkey" ON "tenants" ("id");
CREATE UNIQUE INDEX "tenants_slug_unique" ON "tenants" ("slug");
CREATE INDEX "idx_tenants_features_feature" ON "tenants_features" ("feature_id");
CREATE INDEX "idx_tenants_features_tenant" ON "tenants_features" ("tenant_id");
CREATE UNIQUE INDEX "idx_tenants_features_unique" ON "tenants_features" ("tenant_id","feature_id");
CREATE UNIQUE INDEX "tenants_features_pkey" ON "tenants_features" ("id");
CREATE INDEX "idx_tenants_rutas_config_custom_habilitado" ON "tenants_rutas_config_custom" ("habilitado");
CREATE INDEX "idx_tenants_rutas_config_custom_prefijo" ON "tenants_rutas_config_custom" ("prefijo");
CREATE INDEX "idx_tenants_rutas_config_custom_tenant" ON "tenants_rutas_config_custom" ("tenant_id");
CREATE INDEX "idx_tenants_rutas_config_custom_tipo_pagina" ON "tenants_rutas_config_custom" ("tipo_pagina_id");
CREATE UNIQUE INDEX "tenants_rutas_config_custom_pkey" ON "tenants_rutas_config_custom" ("id");
CREATE UNIQUE INDEX "tenants_rutas_config_custom_tenant_id_prefijo_unique" ON "tenants_rutas_config_custom" ("tenant_id","prefijo");
CREATE INDEX "idx_testimonios_asesor" ON "testimonios" ("asesor_id");
CREATE INDEX "idx_testimonios_contacto" ON "testimonios" ("contacto_id");
CREATE INDEX "idx_testimonios_propiedad" ON "testimonios" ("propiedad_id");
CREATE INDEX "idx_testimonios_publicado" ON "testimonios" ("publicado","destacado");
CREATE INDEX "idx_testimonios_rating" ON "testimonios" ("rating");
CREATE INDEX "idx_testimonios_tenant" ON "testimonios" ("tenant_id");
CREATE UNIQUE INDEX "testimonios_pkey" ON "testimonios" ("id");
CREATE UNIQUE INDEX "testimonios_tenant_id_slug_key" ON "testimonios" ("tenant_id","slug");
CREATE UNIQUE INDEX "tipos_pagina_codigo_unique" ON "tipos_pagina" ("codigo");
CREATE UNIQUE INDEX "tipos_pagina_id_idx" ON "tipos_pagina" ("id");
CREATE UNIQUE INDEX "tipos_pagina_pkey" ON "tipos_pagina" ("id");
CREATE INDEX "idx_ubicaciones_activo" ON "ubicaciones" ("activo");
CREATE INDEX "idx_ubicaciones_alias" ON "ubicaciones" USING gin ("alias");
CREATE INDEX "idx_ubicaciones_destacado" ON "ubicaciones" ("destacado");
CREATE INDEX "idx_ubicaciones_nivel" ON "ubicaciones" ("nivel");
CREATE INDEX "idx_ubicaciones_parent_id" ON "ubicaciones" ("parent_id");
CREATE INDEX "idx_ubicaciones_servicios" ON "ubicaciones" USING gin ("servicios");
CREATE INDEX "idx_ubicaciones_stats" ON "ubicaciones" USING gin ("stats");
CREATE INDEX "idx_ubicaciones_tipo" ON "ubicaciones" ("tipo");
CREATE INDEX "idx_ubicaciones_traducciones" ON "ubicaciones" USING gin ("traducciones");
CREATE UNIQUE INDEX "ubicaciones_parent_id_slug_key" ON "ubicaciones" ("parent_id","slug");
CREATE UNIQUE INDEX "ubicaciones_pkey" ON "ubicaciones" ("id");
CREATE UNIQUE INDEX "idx_unidades_codigo_unico" ON "unidades_proyecto" ("propiedad_id","codigo");
CREATE INDEX "idx_unidades_estado" ON "unidades_proyecto" ("estado");
CREATE INDEX "idx_unidades_propiedad" ON "unidades_proyecto" ("propiedad_id");
CREATE INDEX "idx_unidades_propiedad_codigo" ON "unidades_proyecto" ("propiedad_id","codigo");
CREATE INDEX "idx_unidades_tenant" ON "unidades_proyecto" ("tenant_id");
CREATE UNIQUE INDEX "unidades_proyecto_pkey" ON "unidades_proyecto" ("id");
CREATE INDEX "idx_university_certificados_tenant" ON "university_certificados" ("tenant_id");
CREATE UNIQUE INDEX "university_certificados_pkey" ON "university_certificados" ("id");
CREATE INDEX "idx_university_cert_emitidos_certificado" ON "university_certificados_emitidos" ("certificado_id");
CREATE INDEX "idx_university_cert_emitidos_codigo" ON "university_certificados_emitidos" ("codigo_verificacion");
CREATE INDEX "idx_university_cert_emitidos_inscripcion" ON "university_certificados_emitidos" ("inscripcion_id");
CREATE UNIQUE INDEX "uk_certificados_emitidos_inscripcion_certificado" ON "university_certificados_emitidos" ("inscripcion_id","certificado_id");
CREATE UNIQUE INDEX "university_certificados_emitidos_codigo_verificacion_key" ON "university_certificados_emitidos" ("codigo_verificacion");
CREATE UNIQUE INDEX "university_certificados_emitidos_pkey" ON "university_certificados_emitidos" ("id");
CREATE INDEX "idx_university_cursos_estado" ON "university_cursos" ("estado");
CREATE INDEX "idx_university_cursos_tenant" ON "university_cursos" ("tenant_id");
CREATE INDEX "idx_university_cursos_tenant_estado" ON "university_cursos" ("tenant_id","estado");
CREATE UNIQUE INDEX "university_cursos_pkey" ON "university_cursos" ("id");
CREATE INDEX "idx_university_cursos_acceso_roles_curso" ON "university_cursos_acceso_roles" ("curso_id");
CREATE INDEX "idx_university_cursos_acceso_roles_rol" ON "university_cursos_acceso_roles" ("rol_id");
CREATE UNIQUE INDEX "university_cursos_acceso_roles_curso_id_rol_id_key" ON "university_cursos_acceso_roles" ("curso_id","rol_id");
CREATE UNIQUE INDEX "university_cursos_acceso_roles_pkey" ON "university_cursos_acceso_roles" ("id");
CREATE UNIQUE INDEX "university_cursos_certificados_curso_id_certificado_id_key" ON "university_cursos_certificados" ("curso_id","certificado_id");
CREATE UNIQUE INDEX "university_cursos_certificados_pkey" ON "university_cursos_certificados" ("id");
CREATE INDEX "idx_university_inscripciones_curso" ON "university_inscripciones" ("curso_id");
CREATE INDEX "idx_university_inscripciones_estado" ON "university_inscripciones" ("estado");
CREATE INDEX "idx_university_inscripciones_tenant" ON "university_inscripciones" ("tenant_id");
CREATE INDEX "idx_university_inscripciones_usuario" ON "university_inscripciones" ("usuario_id");
CREATE UNIQUE INDEX "university_inscripciones_curso_id_usuario_id_key" ON "university_inscripciones" ("curso_id","usuario_id");
CREATE UNIQUE INDEX "university_inscripciones_pkey" ON "university_inscripciones" ("id");
CREATE INDEX "idx_university_progreso_inscripcion" ON "university_progreso" ("inscripcion_id");
CREATE INDEX "idx_university_progreso_video" ON "university_progreso" ("video_id");
CREATE UNIQUE INDEX "university_progreso_inscripcion_id_video_id_key" ON "university_progreso" ("inscripcion_id","video_id");
CREATE UNIQUE INDEX "university_progreso_pkey" ON "university_progreso" ("id");
CREATE INDEX "idx_university_secciones_curso" ON "university_secciones" ("curso_id");
CREATE INDEX "idx_university_secciones_orden" ON "university_secciones" ("curso_id","orden");
CREATE UNIQUE INDEX "university_secciones_pkey" ON "university_secciones" ("id");
CREATE INDEX "idx_university_videos_orden" ON "university_videos" ("seccion_id","orden");
CREATE INDEX "idx_university_videos_seccion" ON "university_videos" ("seccion_id");
CREATE UNIQUE INDEX "university_videos_pkey" ON "university_videos" ("id");
CREATE INDEX "idx_usuarios_cedula" ON "usuarios" ("cedula");
CREATE INDEX "idx_usuarios_clerk_id" ON "usuarios" ("clerk_id");
CREATE INDEX "idx_usuarios_email" ON "usuarios" ("email");
CREATE INDEX "idx_usuarios_empresa" ON "usuarios" ("empresa");
CREATE INDEX "idx_usuarios_platform_admin" ON "usuarios" ("es_platform_admin");
CREATE UNIQUE INDEX "usuarios_clerk_id_unique" ON "usuarios" ("clerk_id");
CREATE UNIQUE INDEX "usuarios_email_unique" ON "usuarios" ("email");
CREATE UNIQUE INDEX "usuarios_pkey" ON "usuarios" ("id");
CREATE INDEX "idx_usuarios_connect_activo" ON "usuarios_connect" ("activo");
CREATE INDEX "idx_usuarios_connect_clerk" ON "usuarios_connect" ("clerk_user_id");
CREATE INDEX "idx_usuarios_connect_tenant" ON "usuarios_connect" ("tenant_id");
CREATE UNIQUE INDEX "idx_usuarios_connect_tenant_email" ON "usuarios_connect" ("tenant_id","email");
CREATE UNIQUE INDEX "usuarios_connect_pkey" ON "usuarios_connect" ("id");
CREATE INDEX "idx_usuarios_docs_tenant" ON "usuarios_documentos" ("tenant_id");
CREATE INDEX "idx_usuarios_docs_tipo" ON "usuarios_documentos" ("tipo");
CREATE INDEX "idx_usuarios_docs_usuario" ON "usuarios_documentos" ("usuario_id");
CREATE UNIQUE INDEX "usuarios_documentos_pkey" ON "usuarios_documentos" ("id");
CREATE INDEX "idx_usuarios_roles_tenant" ON "usuarios_roles" ("tenant_id");
CREATE UNIQUE INDEX "idx_usuarios_roles_unique" ON "usuarios_roles" ("usuario_id","tenant_id","rol_id");
CREATE INDEX "idx_usuarios_roles_usuario" ON "usuarios_roles" ("usuario_id");
CREATE UNIQUE INDEX "usuarios_roles_pkey" ON "usuarios_roles" ("id");
CREATE INDEX "idx_usuarios_tenants_tenant" ON "usuarios_tenants" ("tenant_id");
CREATE INDEX "idx_usuarios_tenants_usuario" ON "usuarios_tenants" ("usuario_id");
CREATE UNIQUE INDEX "usuarios_tenants_pkey" ON "usuarios_tenants" ("usuario_id","tenant_id");
CREATE INDEX "usuarios_tenants_ref_index" ON "usuarios_tenants" ("ref");
CREATE UNIQUE INDEX "usuarios_tenants_ref_unique" ON "usuarios_tenants" ("ref");
CREATE INDEX "idx_ventas_cancelada" ON "ventas" ("cancelada");
CREATE INDEX "idx_ventas_captador" ON "ventas" ("captador_id");
CREATE INDEX "idx_ventas_completada" ON "ventas" ("completada");
CREATE INDEX "idx_ventas_contacto" ON "ventas" ("contacto_id");
CREATE INDEX "idx_ventas_estado" ON "ventas" ("estado_venta_id");
CREATE INDEX "idx_ventas_estado_cobro" ON "ventas" ("estado_cobro");
CREATE INDEX "idx_ventas_estado_pagos" ON "ventas" ("estado_pagos");
CREATE INDEX "idx_ventas_fecha_cierre" ON "ventas" ("fecha_cierre");
CREATE INDEX "idx_ventas_numero" ON "ventas" ("numero_venta");
CREATE INDEX "idx_ventas_propiedad" ON "ventas" ("propiedad_id");
CREATE INDEX "idx_ventas_solicitud" ON "ventas" ("solicitud_id");
CREATE INDEX "idx_ventas_tenant" ON "ventas" ("tenant_id");
CREATE INDEX "idx_ventas_unidad" ON "ventas" ("unidad_id");
CREATE INDEX "idx_ventas_usuario" ON "ventas" ("usuario_cerrador_id");
CREATE INDEX "idx_ventas_vendedor_externo" ON "ventas" ("vendedor_externo_id");
CREATE UNIQUE INDEX "ventas_pkey" ON "ventas" ("id");
CREATE INDEX "idx_ventas_cobros_activo" ON "ventas_cobros" ("activo");
CREATE INDEX "idx_ventas_cobros_fecha" ON "ventas_cobros" ("fecha_cobro");
CREATE INDEX "idx_ventas_cobros_tenant" ON "ventas_cobros" ("tenant_id");
CREATE INDEX "idx_ventas_cobros_venta" ON "ventas_cobros" ("venta_id");
CREATE UNIQUE INDEX "ventas_cobros_pkey" ON "ventas_cobros" ("id");
CREATE INDEX "idx_ventas_historial_fecha" ON "ventas_historial" ("created_at");
CREATE INDEX "idx_ventas_historial_tenant" ON "ventas_historial" ("tenant_id");
CREATE INDEX "idx_ventas_historial_tipo" ON "ventas_historial" ("tipo_cambio");
CREATE INDEX "idx_ventas_historial_usuario" ON "ventas_historial" ("usuario_id");
CREATE INDEX "idx_ventas_historial_venta" ON "ventas_historial" ("venta_id");
CREATE UNIQUE INDEX "ventas_historial_pkey" ON "ventas_historial" ("id");
CREATE INDEX "idx_videos_autor" ON "videos" ("autor_id");
CREATE INDEX "idx_videos_categoria" ON "videos" ("categoria_id");
CREATE INDEX "idx_videos_publicado" ON "videos" ("publicado","orden");
CREATE INDEX "idx_videos_tenant" ON "videos" ("tenant_id");
CREATE UNIQUE INDEX "videos_pkey" ON "videos" ("id");
CREATE UNIQUE INDEX "videos_tenant_id_slug_key" ON "videos" ("tenant_id","slug");
CREATE INDEX "users_sync_deleted_at_idx" ON "neon_auth"."users_sync" ("deleted_at");
CREATE UNIQUE INDEX "users_sync_pkey" ON "neon_auth"."users_sync" ("id");