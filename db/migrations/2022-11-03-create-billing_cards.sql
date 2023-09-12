create table billing_cards
(
	id serial not null
		constraint billing_cards_pk
			primary key,
	user_id int not null,
	provider_uid varchar(255) not null,
	status varchar(50) default 'pending' not null,
	card_type varchar(50) not null,
	card_bank varchar(100),
	name_on_card varchar(255),
	masked_card_number varchar(255),
	is_primary boolean default false,
	expire_at timestamptz,
  provider_response text,
  provider_link varchar(255),
	created_at timestamptz default current_timestamp,
	updated_at timestamptz default current_timestamp
);

