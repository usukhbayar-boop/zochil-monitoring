CREATE TABLE crowdfund_campaigns (
	id serial not null
		constraint crowdfund_campaigns_pk
			primary key,
    domain varchar(200) NOT NULL
    title varchar(200) NOT NULL,
    goal bigint NOT NULL,
    logo varchar(200),
    image varchar(200),
    description text,
    user_id integer,
    category_id integer,
    category_name varchar(200),
    due_date timestamptz DEFAULT CURRENT_TIMESTAMP,
    summary varchar(500),
    mission text,
    risk text,
    finance jsonb DEFAULT '[]'::jsonb,
    raised bigint DEFAULT 0,
    donation_count integer DEFAULT 0,
    support_count integer DEFAULT 0,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    gallery jsonb,
    status varchar(20) DEFAULT 'pending',
    campaign_type varchar(20) DEFAULT 'donation',
    address varchar(200),
    google_map_data jsonb,
    lat_lng jsonb,
    zoom double precision DEFAULT 8,
    qpay_merchant_id varchar(100),
    qpay_template_id varchar(100),
    qpay_name varchar(200)
);

create unique index crowdfund_campaigns_domain_uindex
	on crowdfund_campaigns (domain);

CREATE TABLE crowdfund_comments (
	id serial not null
		constraint crowdfund_comments_pk
			primary key,
    summary varchar(200),
    body text,
    user_id integer NOT NULL,
    full_name varchar(200),
    likes integer DEFAULT 0,
    comment_type varchar(20),
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    campaign_id integer,
    petition_id integer
);


CREATE TABLE crowdfund_donations (
	id serial not null
		constraint crowdfund_donations_pk
			primary key,
    user_id integer,
    campaign_id integer NOT NULL,
    amount bigint,
    message varchar(500),
    status varchar(20) DEFAULT 'pending',
    invoice_id integer,
    payment_method varchar(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    phone varchar(100),
    error_message varchar(200),
    full_name varchar(200),
    code varchar(100),
    is_planting boolean DEFAULT false,
    plant_type varchar(50)
);

CREATE TABLE crowdfund_invoices (
	id serial not null
		constraint crowdfund_invoices_pk
			primary key,
    provider varchar(50) NOT NULL,
    amount integer NOT NULL,
    status varchar(100) NOT NULL,
    invoiceno varchar(200),
    response text,
    user_id integer,
    verified_at timestamp with time zone,
    redirect_uri varchar(200),
    checkout_url varchar(200),
    qrcode varchar(200),
    deeplinks jsonb,
    phone varchar(100),
    error_message varchar(500),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    donation_id integer
);


CREATE TABLE crowdfund_updates (
	id serial not null
		constraint crowdfund_updates_pk
			primary key,
    campaign_id integer,
    title varchar(200) NOT NULL,
    body varchar(1000),
    image varchar(200),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    update_type varchar(20) NOT NULL,
    petition_id integer,
    summary varchar(500)
);

