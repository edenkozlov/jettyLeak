-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.building (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
name text,
full_address text,
latitude double precision,
longitude double precision,
client_id uuid,
footprint jsonb,
number_of_floors bigint,
CONSTRAINT building_pkey PRIMARY KEY (id),
CONSTRAINT building_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.client(id)
);
CREATE TABLE public.client (
id uuid NOT NULL DEFAULT gen_random_uuid(),
created_at timestamp with time zone NOT NULL DEFAULT now(),
email text,
first_name text,
last_name text,
CONSTRAINT client_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fixtures (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
building_id bigint,
floor_number bigint,
type USER-DEFINED,
location_on_floor jsonb,
sensor_id bigint,
CONSTRAINT fixtures_pkey PRIMARY KEY (id),
CONSTRAINT fixtures_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(id),
CONSTRAINT fixtures_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id)
);
CREATE TABLE public.floor (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
number bigint,
building_id bigint,
CONSTRAINT floor_pkey PRIMARY KEY (id),
CONSTRAINT floor_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(id)
);
CREATE TABLE public.floor_to_sensor (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
sensor_id bigint,
building_id bigint,
CONSTRAINT floor_to_sensor_pkey PRIMARY KEY (id),
CONSTRAINT floor_to_sensor_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id),
CONSTRAINT floor_to_sensor_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(id)
);
CREATE TABLE public.interested (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
email text NOT NULL UNIQUE,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT interested_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mag_report (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
x_axis_reading real,
y_axis_reading real,
z_axis_reading real,
total_magnitude real,
sensor_id bigint,
band_energy_10s double precision,
band_energy_60s double precision,
band_energy_5m double precision,
dominant_freq_hz double precision,
vibration_rpm double precision,
flow_running boolean,
flow_intensity double precision,
CONSTRAINT mag_report_pkey PRIMARY KEY (id),
CONSTRAINT mag_report_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id)
);
CREATE TABLE public.mag_to_building (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
mag_id bigint,
building_id bigint,
CONSTRAINT mag_to_building_pkey PRIMARY KEY (id),
CONSTRAINT mag_to_building_mag_id_fkey FOREIGN KEY (mag_id) REFERENCES public.sensor(id),
CONSTRAINT mag_to_building_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(id)
);
CREATE TABLE public.notifications (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
user_id uuid NOT NULL,
sensor_id bigint,
title text NOT NULL,
body text NOT NULL,
read boolean NOT NULL DEFAULT false,
created_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT notifications_pkey PRIMARY KEY (id),
CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
id uuid NOT NULL,
role USER-DEFINED NOT NULL DEFAULT 'client'::user_role,
created_at timestamp with time zone NOT NULL DEFAULT now(),
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT profiles_pkey PRIMARY KEY (id),
CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.push_tokens (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
user_id uuid NOT NULL UNIQUE,
token text NOT NULL,
platform text NOT NULL DEFAULT 'ios'::text,
updated_at timestamp with time zone NOT NULL DEFAULT now(),
CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.range_label (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
start_date timestamp with time zone,
end_date timestamp with time zone,
label text,
sensor bigint,
CONSTRAINT range_label_pkey PRIMARY KEY (id),
CONSTRAINT range_label_sensor_fkey FOREIGN KEY (sensor) REFERENCES public.sensor(id)
);
CREATE TABLE public.report (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
sensor_id bigint,
flow_value double precision,
temp_value double precision,
up_sig numeric,
down_sig numeric,
CONSTRAINT report_pkey PRIMARY KEY (id),
CONSTRAINT report_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id)
);
CREATE TABLE public.sensor (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
building_id bigint,
name text,
location text,
sensor_state jsonb,
mappings jsonb,
floor_number bigint,
area_covered jsonb,
location_on_floor jsonb,
multiplier numeric,
CONSTRAINT sensor_pkey PRIMARY KEY (id),
CONSTRAINT sensor_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.building(id)
);
CREATE TABLE public.signal (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
value text,
time timestamp with time zone,
sensor_id bigint,
start_time timestamp with time zone,
end_time timestamp with time zone,
CONSTRAINT signal_pkey PRIMARY KEY (id),
CONSTRAINT signal_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id)
);
CREATE TABLE public.tag (
id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
created_at timestamp with time zone NOT NULL DEFAULT now(),
sensor_id bigint,
tagged_at timestamp with time zone NOT NULL,
title text NOT NULL,
description text,
CONSTRAINT tag_pkey PRIMARY KEY (id),
CONSTRAINT tag_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id)
);
