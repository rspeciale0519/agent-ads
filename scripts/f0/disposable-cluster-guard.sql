SET search_path = pg_catalog, pg_temp;

DO $cluster_verification$
DECLARE
  allowed_database text := NULLIF(current_setting('f0.allowed_database', true), '');
  expected_database_count integer;
  expected_database text := current_setting('f0.expected_database');
  unexpected_access_method text;
  unexpected_auth_membership text;
  unexpected_cast text;
  unexpected_collation text;
  unexpected_conversion text;
  unexpected_database text;
  unexpected_database_acl text;
  unexpected_database_attributes text;
  unexpected_default_acl text;
  unexpected_event_trigger text;
  unexpected_extension text;
  unexpected_foreign_data_wrapper text;
  unexpected_foreign_server text;
  unexpected_language text;
  unexpected_large_object text;
  unexpected_namespace text;
  unexpected_operator text;
  unexpected_operator_class text;
  unexpected_operator_family text;
  unexpected_parameter_acl text;
  unexpected_prepared_transaction text;
  unexpected_publication text;
  unexpected_relation text;
  unexpected_replication_origin text;
  unexpected_replication_slot text;
  unexpected_role text;
  unexpected_role_setting text;
  unexpected_routine text;
  unexpected_subscription text;
  unexpected_tablespace text;
  unexpected_text_search_configuration text;
  unexpected_text_search_dictionary text;
  unexpected_text_search_parser text;
  unexpected_text_search_template text;
  unexpected_type text;
BEGIN
  IF current_database() <> expected_database THEN
    RAISE EXCEPTION 'F0 disposable guard has an unexpected database name';
  END IF;

  IF current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'F0 disposable guard requires PostgreSQL 17';
  END IF;

  SELECT datname INTO unexpected_database
  FROM pg_database
  WHERE datname NOT IN ('postgres', 'template0', 'template1')
    AND (allowed_database IS NULL OR datname <> allowed_database)
  ORDER BY datname
  LIMIT 1;
  IF unexpected_database IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected database';
  END IF;

  SELECT count(*) INTO expected_database_count
  FROM pg_database
  WHERE datname IN ('postgres', 'template0', 'template1')
     OR datname = allowed_database;
  IF expected_database_count <> 3 + (CASE WHEN allowed_database IS NULL THEN 0 ELSE 1 END) THEN
    RAISE EXCEPTION 'F0 disposable guard found a missing expected database';
  END IF;

  SELECT database_entry.datname INTO unexpected_database_attributes
  FROM pg_database AS database_entry
  CROSS JOIN pg_database AS template_reference
  WHERE template_reference.datname = 'template1'
    AND (
      database_entry.datname IN ('postgres', 'template0', 'template1')
      OR database_entry.datname = allowed_database
    )
    AND (
      database_entry.datdba <> current_user::regrole
      OR database_entry.datistemplate <> (database_entry.datname IN ('template0', 'template1'))
      OR database_entry.datallowconn <> (database_entry.datname <> 'template0')
      OR database_entry.dathasloginevt
      OR database_entry.datconnlimit <> -1
      OR database_entry.encoding <> template_reference.encoding
      OR database_entry.datlocprovider <> template_reference.datlocprovider
      OR database_entry.datcollate <> template_reference.datcollate
      OR database_entry.datctype <> template_reference.datctype
      OR database_entry.datlocale IS DISTINCT FROM template_reference.datlocale
      OR database_entry.daticurules IS DISTINCT FROM template_reference.daticurules
      OR (
        -- initdb intentionally disables collation-version checks for template0.
        database_entry.datname = 'template0'
        AND database_entry.datcollversion IS NOT NULL
      )
      OR (
        database_entry.datname <> 'template0'
        AND database_entry.datcollversion IS DISTINCT FROM template_reference.datcollversion
      )
      OR database_entry.dattablespace <> (
        SELECT oid FROM pg_tablespace WHERE spcname = 'pg_default'
      )
    )
  ORDER BY database_entry.datname
  LIMIT 1;
  IF unexpected_database_attributes IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found unexpected database attributes';
  END IF;

  SELECT database_entry.datname INTO unexpected_database_acl
  FROM pg_database AS database_entry
  WHERE (
      database_entry.datname IN ('postgres')
      OR database_entry.datname = allowed_database
    )
    AND database_entry.datacl IS NOT NULL
  OR database_entry.datname IN ('template0', 'template1')
    AND (
      database_entry.datacl IS NULL
      OR (SELECT count(*) FROM aclexplode(database_entry.datacl)) <> 4
      OR EXISTS (
        SELECT 1
        FROM aclexplode(database_entry.datacl) AS permission
        WHERE permission.grantor <> database_entry.datdba
           OR permission.is_grantable
           OR NOT (
             permission.grantee = 0
             AND permission.privilege_type = 'CONNECT'
             OR permission.grantee = database_entry.datdba
             AND permission.privilege_type IN ('CONNECT', 'CREATE', 'TEMPORARY')
           )
      )
      OR NOT EXISTS (
        SELECT 1
        FROM aclexplode(database_entry.datacl) AS permission
        WHERE permission.grantee = 0
          AND permission.privilege_type = 'CONNECT'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM aclexplode(database_entry.datacl) AS permission
        WHERE permission.grantee = database_entry.datdba
          AND permission.privilege_type = 'CONNECT'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM aclexplode(database_entry.datacl) AS permission
        WHERE permission.grantee = database_entry.datdba
          AND permission.privilege_type = 'CREATE'
      )
      OR NOT EXISTS (
        SELECT 1
        FROM aclexplode(database_entry.datacl) AS permission
        WHERE permission.grantee = database_entry.datdba
          AND permission.privilege_type = 'TEMPORARY'
      )
    )
  ORDER BY database_entry.datname
  LIMIT 1;
  IF unexpected_database_acl IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found unexpected database privileges';
  END IF;

  WITH expected_role(role_oid, role_name) AS (
    VALUES
      (6171::oid, 'pg_database_owner'::name),
      (6181::oid, 'pg_read_all_data'::name),
      (6182::oid, 'pg_write_all_data'::name),
      (3373::oid, 'pg_monitor'::name),
      (3374::oid, 'pg_read_all_settings'::name),
      (3375::oid, 'pg_read_all_stats'::name),
      (3377::oid, 'pg_stat_scan_tables'::name),
      (4569::oid, 'pg_read_server_files'::name),
      (4570::oid, 'pg_write_server_files'::name),
      (4571::oid, 'pg_execute_server_program'::name),
      (4200::oid, 'pg_signal_backend'::name),
      (4544::oid, 'pg_checkpoint'::name),
      (6337::oid, 'pg_maintain'::name),
      (4550::oid, 'pg_use_reserved_connections'::name),
      (6304::oid, 'pg_create_subscription'::name)
  ),
  actual_role AS (
    SELECT role.*
    FROM pg_authid AS role
    WHERE role.rolname <> current_user
  )
  SELECT COALESCE(expected_role.role_name, actual_role.rolname)::text INTO unexpected_role
  FROM expected_role
  FULL JOIN actual_role
    ON actual_role.oid = expected_role.role_oid
   AND actual_role.rolname = expected_role.role_name
  WHERE expected_role.role_oid IS NULL
     OR actual_role.oid IS NULL
     OR actual_role.rolsuper
     OR NOT actual_role.rolinherit
     OR actual_role.rolcreaterole
     OR actual_role.rolcreatedb
     OR actual_role.rolcanlogin
     OR actual_role.rolreplication
     OR actual_role.rolbypassrls
     OR actual_role.rolconnlimit <> -1
     OR actual_role.rolpassword IS NOT NULL
     OR actual_role.rolvaliduntil IS NOT NULL
  ORDER BY COALESCE(expected_role.role_name, actual_role.rolname)
  LIMIT 1;
  IF unexpected_role IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected predefined role';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = current_user
      AND rolsuper
      AND rolinherit
      AND rolcreaterole
      AND rolcreatedb
      AND rolcanlogin
      AND rolreplication
      AND rolbypassrls
      AND rolconnlimit = -1
      AND rolvaliduntil IS NULL
      AND rolconfig IS NULL
  ) THEN
    RAISE EXCEPTION 'F0 disposable guard found unexpected current-role attributes';
  END IF;

  WITH expected_membership(
    granted_role,
    member_role,
    admin_option,
    inherit_option,
    set_option
  ) AS (
    VALUES
      ('pg_read_all_settings'::name, 'pg_monitor'::name, false, true, true),
      ('pg_read_all_stats'::name, 'pg_monitor'::name, false, true, true),
      ('pg_stat_scan_tables'::name, 'pg_monitor'::name, false, true, true)
  ),
  actual_membership AS (
    SELECT
      granted_role.rolname AS granted_role,
      member_role.rolname AS member_role,
      grantor_role.rolname AS grantor_role,
      membership.admin_option,
      membership.inherit_option,
      membership.set_option
    FROM pg_auth_members AS membership
    JOIN pg_authid AS granted_role ON granted_role.oid = membership.roleid
    JOIN pg_authid AS member_role ON member_role.oid = membership.member
    JOIN pg_authid AS grantor_role ON grantor_role.oid = membership.grantor
  )
  SELECT COALESCE(
    expected_membership.granted_role || '->' || expected_membership.member_role,
    actual_membership.granted_role || '->' || actual_membership.member_role
  ) INTO unexpected_auth_membership
  FROM expected_membership
  FULL JOIN actual_membership
    ON actual_membership.granted_role = expected_membership.granted_role
   AND actual_membership.member_role = expected_membership.member_role
   AND actual_membership.admin_option = expected_membership.admin_option
   AND actual_membership.inherit_option = expected_membership.inherit_option
   AND actual_membership.set_option = expected_membership.set_option
  WHERE expected_membership.granted_role IS NULL
     OR actual_membership.granted_role IS NULL
     OR actual_membership.grantor_role <> current_user
  ORDER BY COALESCE(expected_membership.granted_role, actual_membership.granted_role),
           COALESCE(expected_membership.member_role, actual_membership.member_role)
  LIMIT 1;
  IF unexpected_auth_membership IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected role membership';
  END IF;

  SELECT spcname INTO unexpected_tablespace
  FROM pg_tablespace
  WHERE spcname NOT IN ('pg_default', 'pg_global')
  ORDER BY spcname
  LIMIT 1;
  IF unexpected_tablespace IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected tablespace';
  END IF;

  WITH expected_access_method(
    access_method_oid,
    access_method_name,
    access_method_handler,
    access_method_type
  ) AS (
    VALUES
      (2::oid, 'heap'::name, 'pg_catalog.heap_tableam_handler'::regproc, 't'::"char"),
      (403::oid, 'btree'::name, 'pg_catalog.bthandler'::regproc, 'i'::"char"),
      (405::oid, 'hash'::name, 'pg_catalog.hashhandler'::regproc, 'i'::"char"),
      (783::oid, 'gist'::name, 'pg_catalog.gisthandler'::regproc, 'i'::"char"),
      (2742::oid, 'gin'::name, 'pg_catalog.ginhandler'::regproc, 'i'::"char"),
      (3580::oid, 'brin'::name, 'pg_catalog.brinhandler'::regproc, 'i'::"char"),
      (4000::oid, 'spgist'::name, 'pg_catalog.spghandler'::regproc, 'i'::"char")
  )
  SELECT COALESCE(expected_access_method.access_method_name, access_method.amname)::text
  INTO unexpected_access_method
  FROM expected_access_method
  FULL JOIN pg_am AS access_method
    ON access_method.oid = expected_access_method.access_method_oid
  WHERE expected_access_method.access_method_oid IS NULL
     OR access_method.oid IS NULL
     OR access_method.amname <> expected_access_method.access_method_name
     OR access_method.amhandler <> expected_access_method.access_method_handler
     OR access_method.amtype <> expected_access_method.access_method_type
  ORDER BY COALESCE(expected_access_method.access_method_name, access_method.amname)
  LIMIT 1;
  IF unexpected_access_method IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected access method';
  END IF;

  SELECT nspname INTO unexpected_namespace
  FROM pg_namespace
  WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'public')
    AND nspname !~ '^pg_toast(_|$)'
    AND nspname !~ '^pg_temp(_|$)'
  ORDER BY nspname
  LIMIT 1;
  IF unexpected_namespace IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected schema';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_namespace
    WHERE nspname = 'public'
      AND nspowner = 'pg_database_owner'::regrole
  ) OR EXISTS (
    SELECT 1
    FROM pg_namespace AS namespace
    CROSS JOIN LATERAL aclexplode(namespace.nspacl) AS permission
    WHERE namespace.nspname = 'public'
      AND NOT (
        (
          permission.grantee = 0
          AND permission.grantor = namespace.nspowner
          AND permission.privilege_type = 'USAGE'
          AND NOT permission.is_grantable
        )
        OR (
          permission.grantee = namespace.nspowner
          AND permission.grantor = namespace.nspowner
          AND permission.privilege_type IN ('CREATE', 'USAGE')
          AND NOT permission.is_grantable
        )
      )
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_namespace AS namespace
    CROSS JOIN LATERAL aclexplode(namespace.nspacl) AS permission
    WHERE namespace.nspname = 'public'
      AND permission.grantee = 0
      AND permission.privilege_type = 'USAGE'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_namespace AS namespace
    CROSS JOIN LATERAL aclexplode(namespace.nspacl) AS permission
    WHERE namespace.nspname = 'public'
      AND permission.grantee = namespace.nspowner
      AND permission.grantor = namespace.nspowner
      AND permission.privilege_type = 'CREATE'
      AND NOT permission.is_grantable
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_namespace AS namespace
    CROSS JOIN LATERAL aclexplode(namespace.nspacl) AS permission
    WHERE namespace.nspname = 'public'
      AND permission.grantee = namespace.nspowner
      AND permission.grantor = namespace.nspowner
      AND permission.privilege_type = 'USAGE'
      AND NOT permission.is_grantable
  ) OR EXISTS (
    SELECT 1
    FROM pg_namespace AS namespace
    CROSS JOIN LATERAL aclexplode(namespace.nspacl) AS permission
    WHERE namespace.nspname = 'public'
      AND permission.grantee = 0
      AND permission.privilege_type = 'CREATE'
  ) THEN
    RAISE EXCEPTION 'F0 disposable guard found unexpected public-schema ownership or privileges';
  END IF;

  SELECT namespace.nspname || '.' || relation.relname INTO unexpected_relation
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE relation.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast(_|$)'
    AND namespace.nspname !~ '^pg_temp(_|$)'
  ORDER BY namespace.nspname, relation.relname
  LIMIT 1;
  IF unexpected_relation IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected relation';
  END IF;

  SELECT namespace.nspname || '.' || routine.proname INTO unexpected_routine
  FROM pg_proc AS routine
  JOIN pg_namespace AS namespace ON namespace.oid = routine.pronamespace
  WHERE routine.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast(_|$)'
    AND namespace.nspname !~ '^pg_temp(_|$)'
  ORDER BY namespace.nspname, routine.proname
  LIMIT 1;
  IF unexpected_routine IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected routine';
  END IF;

  SELECT namespace.nspname || '.' || data_type.typname INTO unexpected_type
  FROM pg_type AS data_type
  JOIN pg_namespace AS namespace ON namespace.oid = data_type.typnamespace
  WHERE data_type.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast(_|$)'
    AND namespace.nspname !~ '^pg_temp(_|$)'
  ORDER BY namespace.nspname, data_type.typname
  LIMIT 1;
  IF unexpected_type IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected type';
  END IF;

  SELECT source_namespace.nspname || '.' || source_type.typname || '->'
         || target_namespace.nspname || '.' || target_type.typname INTO unexpected_cast
  FROM pg_cast AS data_cast
  JOIN pg_type AS source_type ON source_type.oid = data_cast.castsource
  JOIN pg_namespace AS source_namespace ON source_namespace.oid = source_type.typnamespace
  JOIN pg_type AS target_type ON target_type.oid = data_cast.casttarget
  JOIN pg_namespace AS target_namespace ON target_namespace.oid = target_type.typnamespace
  LEFT JOIN pg_proc AS cast_function ON cast_function.oid = data_cast.castfunc
  LEFT JOIN pg_namespace AS function_namespace ON function_namespace.oid = cast_function.pronamespace
  WHERE data_cast.oid >= 16384
     OR source_namespace.nspname NOT IN ('pg_catalog', 'information_schema')
     OR target_namespace.nspname NOT IN ('pg_catalog', 'information_schema')
     OR function_namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY source_namespace.nspname, source_type.typname, target_namespace.nspname, target_type.typname
  LIMIT 1;
  IF unexpected_cast IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected cast';
  END IF;

  SELECT namespace.nspname || '.' || database_operator.oprname INTO unexpected_operator
  FROM pg_operator AS database_operator
  JOIN pg_namespace AS namespace ON namespace.oid = database_operator.oprnamespace
  WHERE database_operator.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, database_operator.oprname
  LIMIT 1;
  IF unexpected_operator IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected operator';
  END IF;

  SELECT namespace.nspname || '.' || database_collation.collname INTO unexpected_collation
  FROM pg_collation AS database_collation
  JOIN pg_namespace AS namespace ON namespace.oid = database_collation.collnamespace
  WHERE database_collation.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, database_collation.collname
  LIMIT 1;
  IF unexpected_collation IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected collation';
  END IF;

  SELECT namespace.nspname || '.' || database_conversion.conname INTO unexpected_conversion
  FROM pg_conversion AS database_conversion
  JOIN pg_namespace AS namespace ON namespace.oid = database_conversion.connamespace
  WHERE database_conversion.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, database_conversion.conname
  LIMIT 1;
  IF unexpected_conversion IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected conversion';
  END IF;

  SELECT namespace.nspname || '.' || operator_class.opcname INTO unexpected_operator_class
  FROM pg_opclass AS operator_class
  JOIN pg_namespace AS namespace ON namespace.oid = operator_class.opcnamespace
  WHERE operator_class.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, operator_class.opcname
  LIMIT 1;
  IF unexpected_operator_class IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected operator class';
  END IF;

  SELECT namespace.nspname || '.' || operator_family.opfname INTO unexpected_operator_family
  FROM pg_opfamily AS operator_family
  JOIN pg_namespace AS namespace ON namespace.oid = operator_family.opfnamespace
  WHERE operator_family.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, operator_family.opfname
  LIMIT 1;
  IF unexpected_operator_family IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected operator family';
  END IF;

  SELECT namespace.nspname || '.' || configuration.cfgname INTO unexpected_text_search_configuration
  FROM pg_ts_config AS configuration
  JOIN pg_namespace AS namespace ON namespace.oid = configuration.cfgnamespace
  WHERE configuration.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, configuration.cfgname
  LIMIT 1;
  IF unexpected_text_search_configuration IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected text-search configuration';
  END IF;

  SELECT namespace.nspname || '.' || dictionary.dictname INTO unexpected_text_search_dictionary
  FROM pg_ts_dict AS dictionary
  JOIN pg_namespace AS namespace ON namespace.oid = dictionary.dictnamespace
  WHERE dictionary.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, dictionary.dictname
  LIMIT 1;
  IF unexpected_text_search_dictionary IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected text-search dictionary';
  END IF;

  SELECT namespace.nspname || '.' || text_parser.prsname INTO unexpected_text_search_parser
  FROM pg_ts_parser AS text_parser
  JOIN pg_namespace AS namespace ON namespace.oid = text_parser.prsnamespace
  WHERE text_parser.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, text_parser.prsname
  LIMIT 1;
  IF unexpected_text_search_parser IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected text-search parser';
  END IF;

  SELECT namespace.nspname || '.' || text_template.tmplname INTO unexpected_text_search_template
  FROM pg_ts_template AS text_template
  JOIN pg_namespace AS namespace ON namespace.oid = text_template.tmplnamespace
  WHERE text_template.oid >= 16384
     OR namespace.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY namespace.nspname, text_template.tmplname
  LIMIT 1;
  IF unexpected_text_search_template IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected text-search template';
  END IF;

  SELECT extname INTO unexpected_extension
  FROM pg_extension
  WHERE extname <> 'plpgsql'
  ORDER BY extname
  LIMIT 1;
  IF unexpected_extension IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected extension';
  END IF;

  SELECT lanname INTO unexpected_language
  FROM pg_language
  WHERE lanname NOT IN ('internal', 'c', 'sql', 'plpgsql')
  ORDER BY lanname
  LIMIT 1;
  IF unexpected_language IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected language';
  END IF;

  SELECT evtname INTO unexpected_event_trigger
  FROM pg_event_trigger
  ORDER BY evtname
  LIMIT 1;
  IF unexpected_event_trigger IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected event trigger';
  END IF;

  SELECT pubname INTO unexpected_publication
  FROM pg_publication
  ORDER BY pubname
  LIMIT 1;
  IF unexpected_publication IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected publication';
  END IF;

  SELECT subname INTO unexpected_subscription
  FROM pg_subscription
  ORDER BY subname
  LIMIT 1;
  IF unexpected_subscription IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected subscription';
  END IF;

  SELECT fdwname INTO unexpected_foreign_data_wrapper
  FROM pg_foreign_data_wrapper
  ORDER BY fdwname
  LIMIT 1;
  IF unexpected_foreign_data_wrapper IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected foreign-data wrapper';
  END IF;

  SELECT srvname INTO unexpected_foreign_server
  FROM pg_foreign_server
  ORDER BY srvname
  LIMIT 1;
  IF unexpected_foreign_server IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected foreign server';
  END IF;

  SELECT oid::text INTO unexpected_large_object
  FROM pg_largeobject_metadata
  ORDER BY oid
  LIMIT 1;
  IF unexpected_large_object IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected large object';
  END IF;

  SELECT setrole::text || ':' || setdatabase::text INTO unexpected_role_setting
  FROM pg_db_role_setting
  ORDER BY setrole, setdatabase
  LIMIT 1;
  IF unexpected_role_setting IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected database role setting';
  END IF;

  SELECT defaclrole::text || ':' || defaclnamespace::text || ':' || defaclobjtype::text
  INTO unexpected_default_acl
  FROM pg_default_acl
  ORDER BY defaclrole, defaclnamespace, defaclobjtype
  LIMIT 1;
  IF unexpected_default_acl IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected default privilege';
  END IF;

  SELECT parname INTO unexpected_parameter_acl
  FROM pg_parameter_acl
  ORDER BY parname
  LIMIT 1;
  IF unexpected_parameter_acl IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected parameter privilege';
  END IF;

  SELECT roname INTO unexpected_replication_origin
  FROM pg_replication_origin
  ORDER BY roname
  LIMIT 1;
  IF unexpected_replication_origin IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected replication origin';
  END IF;

  SELECT slot_name INTO unexpected_replication_slot
  FROM pg_replication_slots
  ORDER BY slot_name
  LIMIT 1;
  IF unexpected_replication_slot IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected replication slot';
  END IF;

  SELECT "transaction"::text INTO unexpected_prepared_transaction
  FROM pg_prepared_xacts
  ORDER BY "transaction"
  LIMIT 1;
  IF unexpected_prepared_transaction IS NOT NULL THEN
    RAISE EXCEPTION 'F0 disposable guard found an unexpected prepared transaction';
  END IF;
END
$cluster_verification$;
