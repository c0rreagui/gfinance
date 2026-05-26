-- Script de sincronização automática de transações
BEGIN;

-- ==========================================================================
-- PROCESSANDO USUÁRIO: 700fb977-fe5a-46cb-afd5-b477a4daca57
-- ==========================================================================

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-05-25T12:00:00.000Z', 'PIX QRS PAGSEGURO I24/05', 'Transferência', -14.87, 'ArrowLeftRight', now(), 'd913e3dc321d9a636c7c5eb870e72851bf6d6d46f25b6c254768777aeba5439d', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-05-19T12:00:00.000Z', 'PIX QRS DLOCAL BRAS19/05', 'Transferência', -64.04, 'ArrowLeftRight', now(), 'e3aa4567791d3b101c7e5ae382ae6ae1f624acb4b99f6487176399020be6514b', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-05-11T12:00:00.000Z', 'INT /SABESP 1664205081', 'Utilidades', -81.24, 'Zap', now(), '839f3c0f06e608068695b7f69209a30ede2dd111121adfa6264b1dbf79b35f25', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-05-04T12:00:00.000Z', 'PIX TRANSF CAROLIN02/05', 'Transferência', 125, 'ArrowLeftRight', now(), 'cf30c597c924ebe6176c4ba72c77c418e896c042565eb492c399a9cd7678b053', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-05-04T12:00:00.000Z', 'PAY BUBBL 02/05', 'Transferência', -22.99, 'ArrowLeftRight', now(), 'b39962ff1d3d0c4ac801174cdd4ad00993e4d65c107d5a7fa5d21228ac2a5f32', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-05-04T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -550.39, 'CreditCard', now(), '0e5ad8b48a3c84a8c346a1eec74ae9567db064a389f49b89ad47d6cc88fdf1e0', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-05-04T12:00:00.000Z', 'PIX QRS PIX Marketp01/05', 'Transferência', -69.9, 'ArrowLeftRight', now(), 'd7b3192e7e40923175a21445dd33fb2e9f3effc6ae0ac8c99402c82ccaf221dd', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-05-04T12:00:00.000Z', 'PAY OUTBA 01/05', 'Transferência', -251.55, 'ArrowLeftRight', now(), 'f725713e6f30f799aad88f655cc303769ba7072034b6effcbb148ada580abff9', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-30T12:00:00.000Z', 'FATURA PAGA ITAU PLATINU', 'Cartão', -184.22, 'CreditCard', now(), '8ff048fae0c04dd95ed46966b871c10d0e04001580dbb6fc4da4082506549574', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-30T12:00:00.000Z', 'PIX TRANSF Lilian 30/04', 'Transferência', -140, 'ArrowLeftRight', now(), '24f61e3d20a75bdce883df08471db0775f5b5582e679ee8ded50ec1f675bbf00', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-30T12:00:00.000Z', 'PAG BOLETO ASSUPERO ENSINO SUPERIOR LTDA', 'Boleto', -522.43, 'FileText', now(), '33e6aa9f4e38cdc7b6aa97adabcdb8954754292b31e6134670d1e1ee5f2953ae', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-30T12:00:00.000Z', 'REMUNERACAO/SALARIO', 'Salário', 1840.26, 'Wallet', now(), '5a13c766b5b667e9c704ac84d600a052d9324446f09005854ee16a4cfe7b8d30', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-29T12:00:00.000Z', 'PGTO MIN ITAU VS PLATINUM', 'Outros', -23.09, 'Circle', now(), 'f0e70f361fce525cfb0dc9f89c99dd740d7cba2fc1309729a50747124ae03177', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-20T12:00:00.000Z', 'PIX TRANSF Luiz Ar18/04', 'Transferência', -10, 'ArrowLeftRight', now(), '748c76241915ab7db49cff276c756366a8629f2c4776b455e4545aa4ceca1a22', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-20T12:00:00.000Z', 'PIX TRANSF Gustavo19/04', 'Transferência', -10, 'ArrowLeftRight', now(), '65a8983517cafe0b561d21fd6b40c5e0795f75ed2390851fb4ae2dac7f663597', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-16T12:00:00.000Z', 'PIX TRANSF Guilher16/04', 'Transferência', 22, 'ArrowLeftRight', now(), '7fda027e296675b78be85ae95788a6c2646c02007fef56a35de5a01afd19c800', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-10T12:00:00.000Z', 'INT /CLARO S.A 003000005', 'Débito', -114.34, 'ArrowUpRight', now(), 'bebd030766f5f8a02154d78b41bd2563731ae83f8d3976cc71d65ee34b4d5c9a', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-10T12:00:00.000Z', 'PIX TRANSF CAROLIN10/04', 'Transferência', 40, 'ArrowLeftRight', now(), '5d928d944a71f3046e0c25abec2a2a47fd88287cda6804b129d107392c4d76d9', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-10T12:00:00.000Z', 'PAY MUNDO 10/04', 'Outros', -73.98, 'Circle', now(), 'add154622abe4cc4e2b5e9bc74b19e26674f9c49dc4215a84e0642fd899731dc', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-06T12:00:00.000Z', 'PAY LILLO 04/04', 'Outros', -60, 'Circle', now(), '5c478a6ce53c5448385935692d2b6f688ecc97f157b9d1812b95cba5f262c0c2', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-06T12:00:00.000Z', 'PAY OTC I 04/04', 'Outros', -186, 'Circle', now(), '47c869196d88b84d5d553960d62676f9a8addde84a1ae6c63794ba88a2a15228', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-04-02T12:00:00.000Z', 'IOF', 'Outros', -0.02, 'Circle', now(), '09e4074837e46eeeab60f504e11a05d04a82bb5a7aa93cb856f5e01227a82587', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-31T12:00:00.000Z', 'REMUNERACAO/SALARIO', 'Salário', 1694.39, 'Wallet', now(), 'ae1573b58cfe0bd9bb4a17b088ffdf0d27e64240f1952dc8cc562302453b1ceb', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-31T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -361.45, 'CreditCard', now(), '110c72ea433c5ca96fad9ba18bd621162b30d6ef2690c058da84d884d89f5d87', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-31T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -648.25, 'CreditCard', now(), '1c21a4f6f8745bc45f3e6c36bb5e232aa529678533f963acd137011a73aec6f5', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-31T12:00:00.000Z', 'PIX QRS NU PAGAMENT31/03', 'Transferência', -273.97, 'ArrowLeftRight', now(), '304ae9b58c73aa7cb3aeef8c1666c7c90dd55884dcb834fd0f846043cd8a2b27', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-31T12:00:00.000Z', 'PIX TRANSF Guilher31/03', 'Transferência', 1.06, 'ArrowLeftRight', now(), 'c98138588496a7af85c440e48b780c200554c8db97156ef955c73e020a1d7d2c', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-31T12:00:00.000Z', 'PAY BANCA 31/03', 'Outros', -5.5, 'Circle', now(), 'e852eb3cdae5e50fd8ab625f3feb95815836a6c2f663388c53dfc17fd0efaaaf', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-27T12:00:00.000Z', 'PIX TRANSF CAROLIN27/03', 'Transferência', -45, 'ArrowLeftRight', now(), 'd64d6df0af6d747898e00b6723f2ed6438a5595367fdb7388aa3c93bdb42fb58', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-25T12:00:00.000Z', 'PIX QRS PICPAY INST25/03', 'Transferência', -0.28, 'ArrowLeftRight', now(), 'e34e437c2d1eb6794c59916845b4cd544e4c7f9fcb94a22847f260569a5f6cd8', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-24T12:00:00.000Z', 'PIX TRANSF BRUNO A24/03', 'Transferência', 20, 'ArrowLeftRight', now(), 'e236b1d8096a46467e589973d9736a54647b72e7809b396bf547033476be6a85', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-23T12:00:00.000Z', 'RESGATE CDB Cofrinhos', 'Rendimentos', 38.1, 'TrendingUp', now(), '5b7f25cdbcfc661f0a402c0e2e9d4257cf8aed627a87d937591307691fc1d96b', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-20T12:00:00.000Z', 'FATURAITAU VS PLATINU', 'Cartão', -29.75, 'CreditCard', now(), '295b4686c8b0f5b4a0ee13311459763be692cd521b3fef127a0724c3a48ce1bb', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-18T12:00:00.000Z', 'PGTO MIN-ITAUCARD-5960', 'Outros', -98.77, 'Circle', now(), '0397f9735b080ccd3791ab4d42eb99305a2efc81bb302a701e68edcf61de1a52', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-18T12:00:00.000Z', 'REND PAGO APLIC AUT MAIS', 'Outros', 0.01, 'Circle', now(), '6f0bef8ec9504d49146a290f5838a318b4e2fec78afb77fb12c9f2f0ab5a20e2', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-16T12:00:00.000Z', 'PIX QRS BIG TECK - 15/03', 'Transferência', -15, 'ArrowLeftRight', now(), '26fae5472eb1b58ad676a50446ab4ddfbb27c209bb6ea8f4045b6b6008bc718d', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-16T12:00:00.000Z', 'REND PAGO APLIC AUT MAIS', 'Outros', 0.01, 'Circle', now(), '1cdc1df3e9f7f76eb3fde828146d25e55115393f353101b4de084e384363a65e', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-12T12:00:00.000Z', 'PAY IFD J 12/03', 'Outros', -9.9, 'Circle', now(), '3f0d3ed1d436a740b064bdaf06b7849ecc57176b5cba624ae40a96b59379c119', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-03-12T12:00:00.000Z', 'REND PAGO APLIC AUT MAIS', 'Outros', 0.01, 'Circle', now(), 'c8b9d290dad177785bfffdcd65dd746c95599a199fc4aaa4347b4feca56ece82', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-27T12:00:00.000Z', 'REMUNERACAO/SALARIO', 'Salário', 1623.41, 'Wallet', now(), 'acd356effe464b95c00b4ebaad4d8a627ab6361d6528cbd49cc15f0c38d28b3a', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-27T12:00:00.000Z', 'PAG BOLETO ASSUPERO ENSINO SUPERIOR LTDA', 'Boleto', -522.43, 'FileText', now(), 'f585d8a34c92aca6d46f6cc5b41563b70b342e92b2f26ae03db5db8f08bd03fc', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-27T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -557.71, 'CreditCard', now(), '8f033737e7d6eb3f3afd5fdc4760aff093cffb5223fadcfa988c64782cfdaa40', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-27T12:00:00.000Z', 'PIX QRS PICPAY INST27/02', 'Transferência', -152.82, 'ArrowLeftRight', now(), 'fa26481e20a788811bd282aa70a1d6396345295729bbea0dd6719e87d995b30d', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-27T12:00:00.000Z', 'PIX QRS PICPAY INST27/02', 'Transferência', -88.63, 'ArrowLeftRight', now(), 'db7c1f279fec7d73863a6860a12aa641d2c66f5b34d82735799ed51b56f3c58e', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-27T12:00:00.000Z', 'PIX QRS PICPAY INST27/02', 'Transferência', -78.5, 'ArrowLeftRight', now(), '83b5ac9bc0255721bbb2edbfb01e20ed501f4bf862b6d62b5c9df3354a40e0e1', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-27T12:00:00.000Z', 'PIX QRS PICPAY INST27/02', 'Transferência', -112.53, 'ArrowLeftRight', now(), '87debd74482f4d9827c29e2bdc6e1c158ea1e9d8fc22aab748f96e80f537210f', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-23T12:00:00.000Z', 'PAY PIZZA 21/02', 'Outros', -56.75, 'Circle', now(), 'e327155674282c845b0054f26015f24d6a2f3b85bf75e4a2c96bb648ddf66921', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-20T12:00:00.000Z', 'FATURAITAU VS PLATINU', 'Cartão', -16.9, 'CreditCard', now(), '133f71c7b9c8cf99ee2e91b9c061c91722c9bc69ad211125af9478cb5f5388bf', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-18T12:00:00.000Z', 'PIX TRANSF Carolin14/02', 'Transferência', 50, 'ArrowLeftRight', now(), 'dfaa4eecf6f5434c29cc50a3d1c62d5be0d77ef7868924cc7bea3bf90e56d0c4', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-18T12:00:00.000Z', 'PIX QRS UBER DO BRA15/02', 'Transferência', -24.93, 'ArrowLeftRight', now(), '4e3214c8f77af3b6aa1ef90d92df25e5ca13ff13465ae50aa9c308e44f2e539c', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-18T12:00:00.000Z', 'PAY APPLE 16/02', 'Assinaturas', -9.9, 'Tv', now(), 'f3e745b9de5c45d33c5e29a03fcc6c3d7cf3641ad584ac6c79a6fd75c7ed6f8e', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-09T12:00:00.000Z', 'PAY Bubbl 08/02', 'Transferência', -56, 'ArrowLeftRight', now(), 'a8f1cae64100be9998bbfd442b0d09ff131b8796682dc7324286a58a8dfea6d9', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-09T12:00:00.000Z', 'PAY IKESA 08/02', 'Outros', -54.99, 'Circle', now(), 'e1e8fe357c7db70fc51bced3f424c1c9dbe838b7f4ddc8d85eb0f129bf03f6dd', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-09T12:00:00.000Z', 'PAY MARUK 08/02', 'Outros', -8.5, 'Circle', now(), '91bd2e8a53d01b46599677eab6206c1ac7081f265ae226411022a53927348dae', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-09T12:00:00.000Z', 'PIX QRS UBER DO BRA09/02', 'Transferência', -18.94, 'ArrowLeftRight', now(), '43d3b5f18e1006e8dcfbc1f56c294e463d855e697a1834c8ae9e016ee850a3ff', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-03T12:00:00.000Z', 'IOF', 'Outros', -1.42, 'Circle', now(), '3769783c24503f7dba43a51f82a20ca9dc8d0773db6bfa1fe7d6548f4e23efa3', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-02T12:00:00.000Z', 'RESGATE CDB Cofrinhos', 'Rendimentos', 770, 'TrendingUp', now(), '8b7ab1eac15ebfb60763bd1613be66b73f9da305dab621c3077475e8cf221101', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-02T12:00:00.000Z', 'PAG TIT INT 033', 'Outros', -522.43, 'Circle', now(), '44b60d8c9a5a4ea61ce47da5279d8573eb3416b351b0dd9b21c9f068e1a2f689', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-02-02T12:00:00.000Z', 'JUROS LIMITE DA CONTA', 'Rendimentos', -16.49, 'TrendingUp', now(), '83e0c6fd1519104651a19b83a652ae7da95be9c10169ecb45e3756d61289bc13', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-30T12:00:00.000Z', 'REMUNERACAO/SALARIO', 'Salário', 1646.11, 'Wallet', now(), '9d62968d1e075329c5e6797cebbe6696fb3dcd6970b3e1166ee7227bfd740eec', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-30T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -1362.27, 'CreditCard', now(), '3747d1975c66cdd48cb102fe34480ce900ee5ff4db1bb11f27451eeaf03e9c88', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-30T12:00:00.000Z', 'FATURA PAGA ITAU PLATINU', 'Cartão', -25.7, 'CreditCard', now(), '581214f6b5012edbb96b47aaadc1bd43b091b2d4e54f01daf7af10a738de4937', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-12T12:00:00.000Z', 'PIX TRANSF Guilher10/01', 'Transferência', -100, 'ArrowLeftRight', now(), 'c7b99b0a349f2d202d249e01de4f765cbe62fae1b4675d6868f00e8b10ae249d', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-05T12:00:00.000Z', 'PAY IKESA 03/01', 'Outros', -27.47, 'Circle', now(), 'c763f6c7f5a6a13dfcbb5ec26d52ec09fcad17cb5040cbc8a6b428928ebe7a97', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-05T12:00:00.000Z', 'PAG BOLETO ASSUPERO ENSINO SUPERIOR LTDA', 'Boleto', -522.43, 'FileText', now(), '5a6b85064aee6929a63cc6a960108921c84335e1712d1fe6b247b078dfc4a9fe', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-05T12:00:00.000Z', 'REND PAGO APLIC AUT MAIS', 'Outros', 0.01, 'Circle', now(), '00046358adae5693f1ebb44426cafe55b5f9191b9d51f87ca08a6ff7a2989d54', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-05T12:00:00.000Z', 'IOF', 'Outros', -0.03, 'Circle', now(), '3a114896504e06c223886c7f1c0ce5652069e724b7663e88a4fe374bb9d905e8', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', '2026-01-02T12:00:00.000Z', 'PAY ANDER 02/01', 'Outros', -40, 'Circle', now(), '14e6f8301a9e01ae06efc7bc7f701406c4291da423800570719515cffac3ac2c', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

-- Atualizar saldos para o usuário
DELETE FROM public.balances WHERE user_id = '700fb977-fe5a-46cb-afd5-b477a4daca57';

INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', 'Saldo Total', -374.3299999999999, '+0.0%', 'Wallet', 'total', now());

INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', 'Receitas', 7870.370000000001, '+0.0%', 'ArrowUpCircle', 'income', now());

INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) 
VALUES (gen_random_uuid(), '700fb977-fe5a-46cb-afd5-b477a4daca57', 'Despesas', 8244.699999999999, '+0.0%', 'ArrowDownCircle', 'expense', now());

-- Log de sincronização
INSERT INTO public.itau_sync_logs (user_id, status, file_name, source_type, records_synced, records_total, records_duplicate, records_error, created_at) 
VALUES ('700fb977-fe5a-46cb-afd5-b477a4daca57', 'success', 'itau_extrato_012026.pdf', 'pdf', 68, 68, 0, 0, now());

-- ==========================================================================
-- PROCESSANDO USUÁRIO: 4ae31623-b7ba-4b09-89b7-beab24b10325
-- ==========================================================================

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-05-25T12:00:00.000Z', 'PIX QRS PAGSEGURO I24/05', 'Transferência', -14.87, 'ArrowLeftRight', now(), 'b0aeabfaa3c9912baaf5f42c49f3208efb9472519e0a122a33a584095f0125c8', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-05-19T12:00:00.000Z', 'PIX QRS DLOCAL BRAS19/05', 'Transferência', -64.04, 'ArrowLeftRight', now(), '208905ffeeb848985776a7b28a919123ffdf9039f890ba360655cf0c9afdf55d', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-05-11T12:00:00.000Z', 'INT /SABESP 1664205081', 'Utilidades', -81.24, 'Zap', now(), 'b355126c779e23707bc78a532412222e52372a95b1bf81ba6322a35a94352300', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-05-04T12:00:00.000Z', 'PIX TRANSF CAROLIN02/05', 'Transferência', 125, 'ArrowLeftRight', now(), '02ea64a291ec01f70fb07702ff8de9d286f1a61530de1a8755d4159d81318936', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-05-04T12:00:00.000Z', 'PAY BUBBL 02/05', 'Transferência', -22.99, 'ArrowLeftRight', now(), '623a74769727148d28532202b02e32032741249b1093912845f51bce2b89f367', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-05-04T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -550.39, 'CreditCard', now(), 'ef4d28bb3e98ff8814486edbd4bda3422a38efe48f7cef6d19b806223d5b0cae', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-05-04T12:00:00.000Z', 'PIX QRS PIX Marketp01/05', 'Transferência', -69.9, 'ArrowLeftRight', now(), 'bb0ee25a5e74d272e8bfc0f90270be1346b5cf52a1eb5973b139994c1229bc33', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-05-04T12:00:00.000Z', 'PAY OUTBA 01/05', 'Transferência', -251.55, 'ArrowLeftRight', now(), 'eab661aa7b3c3c6a43fb773f75b035503482d6704c343fde039437a782c201f9', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-30T12:00:00.000Z', 'FATURA PAGA ITAU PLATINU', 'Cartão', -184.22, 'CreditCard', now(), 'c5f200cea4f950eae3241574c3e6daf62199e6ecd8ed4457205a6b8af44f3116', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-30T12:00:00.000Z', 'PIX TRANSF Lilian 30/04', 'Transferência', -140, 'ArrowLeftRight', now(), '0e92a1f72c9c8c78fa486cbc3a91f02b23a2e5e2b832ca24572cf9b050c57db1', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-30T12:00:00.000Z', 'PAG BOLETO ASSUPERO ENSINO SUPERIOR LTDA', 'Boleto', -522.43, 'FileText', now(), '99baf69e58a1c28a92d18315d6b90b533670f11a4265d739415bcf59792c2eb9', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-30T12:00:00.000Z', 'REMUNERACAO/SALARIO', 'Salário', 1840.26, 'Wallet', now(), '946b4db4044b6d853f83be864763f728ed5f894f61dae4733ba545636458a27c', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-29T12:00:00.000Z', 'PGTO MIN ITAU VS PLATINUM', 'Outros', -23.09, 'Circle', now(), 'bb5220b89990ce361d75a83c025505bb223a2507bb18408e8c8f8c8418bcf9c7', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-20T12:00:00.000Z', 'PIX TRANSF Luiz Ar18/04', 'Transferência', -10, 'ArrowLeftRight', now(), '1dc5c92b3a864d298674a2a8a67057c2793cb98a8a3e24f01bacb3826a0917dc', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-20T12:00:00.000Z', 'PIX TRANSF Gustavo19/04', 'Transferência', -10, 'ArrowLeftRight', now(), '5932183eeba4f754db1a85bd5d6ac46b0ad93dd67a8cd26c0a4b83670136e1d9', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-16T12:00:00.000Z', 'PIX TRANSF Guilher16/04', 'Transferência', 22, 'ArrowLeftRight', now(), 'a2ac074daa65399999a6c16e6c5b2074e8e0fe6c77aea1883c253459265d929c', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-10T12:00:00.000Z', 'INT /CLARO S.A 003000005', 'Débito', -114.34, 'ArrowUpRight', now(), '26bf338d18168dc66caea995ff8a511ec2d85ad96e49c43a60670379d175da0c', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-10T12:00:00.000Z', 'PIX TRANSF CAROLIN10/04', 'Transferência', 40, 'ArrowLeftRight', now(), '9f89e96a987e9c238f33ea10190fa71936c4d1dfbb96604916d9201e5c9bda0b', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-10T12:00:00.000Z', 'PAY MUNDO 10/04', 'Outros', -73.98, 'Circle', now(), '37d548ffb5bfd0b3df1b390b755b733f550e08623e011ae6463c4e3e609cc7f6', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-06T12:00:00.000Z', 'PAY LILLO 04/04', 'Outros', -60, 'Circle', now(), '4b0a807dcc553851e67574a7c1e8577aa26e471c888f325b68cf1802c5610ba3', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-06T12:00:00.000Z', 'PAY OTC I 04/04', 'Outros', -186, 'Circle', now(), 'eaf34741e0b30a926fa21d6c6ce94e606e6810fc79db727dd2747c8208f43ce0', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-04-02T12:00:00.000Z', 'IOF', 'Outros', -0.02, 'Circle', now(), '29390025bba62ef70d807a16efdee54854b0df4af7711705f22ea6cbbac15c42', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-31T12:00:00.000Z', 'REMUNERACAO/SALARIO', 'Salário', 1694.39, 'Wallet', now(), '691a6082cd3d9b3324f345d8d12e0300283ab7a324a8991feeeb4b9fbeeef630', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-31T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -361.45, 'CreditCard', now(), '83d7e663baafd56971831cd1a73bdc903c10947b9afe84d04e84dbe06fb5d0ae', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-31T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -648.25, 'CreditCard', now(), '23702151bc8b9ab8343a287c8d559e61ec36d05455f996c81c153d4c2feade01', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-31T12:00:00.000Z', 'PIX QRS NU PAGAMENT31/03', 'Transferência', -273.97, 'ArrowLeftRight', now(), '5e0053029f6f6caa6b1f8a54e4358f6d182ec08a4ef9387772ec8b77981857c9', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-31T12:00:00.000Z', 'PIX TRANSF Guilher31/03', 'Transferência', 1.06, 'ArrowLeftRight', now(), '5e86054204149dd8f2c90343143edce43519617a1f0a5d3717d3dde0c420ea68', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-31T12:00:00.000Z', 'PAY BANCA 31/03', 'Outros', -5.5, 'Circle', now(), 'b23bf476fe5d375534a90c39a1281a5ef7e88af47a35c3a8a3d7cb975491f24d', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-27T12:00:00.000Z', 'PIX TRANSF CAROLIN27/03', 'Transferência', -45, 'ArrowLeftRight', now(), '679af225296999abb719193d9a0057b377b3bb76a7ee72bb4a548deaea050e88', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-25T12:00:00.000Z', 'PIX QRS PICPAY INST25/03', 'Transferência', -0.28, 'ArrowLeftRight', now(), '0e9001356e6c8d3cba58c19f6af0f851aafbb93a3feafdafb9128bc54b4be010', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-24T12:00:00.000Z', 'PIX TRANSF BRUNO A24/03', 'Transferência', 20, 'ArrowLeftRight', now(), 'd5ef9ea2a8d4f80cfd87a3c53b03610c611f9a61c05482a9843a37c7222aa068', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-23T12:00:00.000Z', 'RESGATE CDB Cofrinhos', 'Rendimentos', 38.1, 'TrendingUp', now(), 'ff7b09645413ab34353ed24e9c7e301975d727f6fc9aad2345a9666dcdd2ee40', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-20T12:00:00.000Z', 'FATURAITAU VS PLATINU', 'Cartão', -29.75, 'CreditCard', now(), 'a7b3ca317e9ee468fc5f431eaf98011a4c1c26702ff9d03718481dec1c876ffc', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-18T12:00:00.000Z', 'PGTO MIN-ITAUCARD-5960', 'Outros', -98.77, 'Circle', now(), '02e9fb293e23f7c1fed54ce7a81e43702bd4dfbdfc9c5aea67bb3c0a7d54746d', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-18T12:00:00.000Z', 'REND PAGO APLIC AUT MAIS', 'Outros', 0.01, 'Circle', now(), '8fdb0af5af724263193e0ae797fec49f48f7b750d87c68d1df8caee29b3fe01a', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-16T12:00:00.000Z', 'PIX QRS BIG TECK - 15/03', 'Transferência', -15, 'ArrowLeftRight', now(), '080dc213fbb5423514636f6c9e40cc4969399d70e956f45429b184a2a93f443d', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-16T12:00:00.000Z', 'REND PAGO APLIC AUT MAIS', 'Outros', 0.01, 'Circle', now(), '203f706a89d7a0ebaab22bb497e21ec5afea0986ec18622b9d4a841235df5d3f', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-12T12:00:00.000Z', 'PAY IFD J 12/03', 'Outros', -9.9, 'Circle', now(), 'dd2e23652df80ea8eb5f4e1d511e8af39e9ed343f5dae40995e203b1d9f5a92b', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-03-12T12:00:00.000Z', 'REND PAGO APLIC AUT MAIS', 'Outros', 0.01, 'Circle', now(), 'f684d82ae73189547901175917de5e85aec93de3bb26c3375e87252e9ace7c34', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-27T12:00:00.000Z', 'REMUNERACAO/SALARIO', 'Salário', 1623.41, 'Wallet', now(), '1236914defd0bbf01460a647323bab5dd1f566c033f70852bb012bff9e1d8a8a', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-27T12:00:00.000Z', 'PAG BOLETO ASSUPERO ENSINO SUPERIOR LTDA', 'Boleto', -522.43, 'FileText', now(), '607393b9e549a04a281cc5ef069646f93fc89de30f22ae0780ad5f27b8ee70c1', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-27T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -557.71, 'CreditCard', now(), 'b9923a862b3b5d910c35d517e9b9e4ecd800597302201b5a0d44b532226bf3c8', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-27T12:00:00.000Z', 'PIX QRS PICPAY INST27/02', 'Transferência', -152.82, 'ArrowLeftRight', now(), '365c9cacb516375859cf65370d6f2a3bd87384f70a480169a7d95f4f79a73c2e', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-27T12:00:00.000Z', 'PIX QRS PICPAY INST27/02', 'Transferência', -88.63, 'ArrowLeftRight', now(), 'e241a05981a8c103b3784cfb634173ac18a485fb8ab29492c953113a554ab47b', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-27T12:00:00.000Z', 'PIX QRS PICPAY INST27/02', 'Transferência', -78.5, 'ArrowLeftRight', now(), '7ac1e2745c661474e89f7b8077d68b1224504604384dccd03f62d03b3b472faf', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-27T12:00:00.000Z', 'PIX QRS PICPAY INST27/02', 'Transferência', -112.53, 'ArrowLeftRight', now(), '7586a8169a436d02396a408b5c2c1e3399fa1b2524d1ac2bb1cf87a2b7bfc92e', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-23T12:00:00.000Z', 'PAY PIZZA 21/02', 'Outros', -56.75, 'Circle', now(), '22f3a2ad0a80e75bf3732dffe7c32d36960ad7e183745f82f9ea27918f785f88', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-20T12:00:00.000Z', 'FATURAITAU VS PLATINU', 'Cartão', -16.9, 'CreditCard', now(), 'ec27ad52500509d699ae5816105ea8f0dbabb580134feec7d3100bac3605e67e', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-18T12:00:00.000Z', 'PIX TRANSF Carolin14/02', 'Transferência', 50, 'ArrowLeftRight', now(), '987451f35836c95fb9630ac04a93fe4dca8b5aeca382c723824145a619abc9f5', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-18T12:00:00.000Z', 'PIX QRS UBER DO BRA15/02', 'Transferência', -24.93, 'ArrowLeftRight', now(), '7f099196a0ce0c4ec7f68904de35965fb1317e58b71de513a4778a090a857fec', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-18T12:00:00.000Z', 'PAY APPLE 16/02', 'Assinaturas', -9.9, 'Tv', now(), 'b2c000d658cd38e991bdca36431960d623e7759727acfd58a2300ca88c0ce6ad', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-09T12:00:00.000Z', 'PAY Bubbl 08/02', 'Transferência', -56, 'ArrowLeftRight', now(), '45761986f47411daca2dfa0b7f98d921015ee5bd62f7747526b5b3ce80174d5f', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-09T12:00:00.000Z', 'PAY IKESA 08/02', 'Outros', -54.99, 'Circle', now(), '18697e0dd215d2f6102927d2f4267f698fa3f7619853198407c32af4cc9c41c0', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-09T12:00:00.000Z', 'PAY MARUK 08/02', 'Outros', -8.5, 'Circle', now(), '8bcdd301a2d217018282c5f47b067d1bf627277a1fb3372292de94e94b089631', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-09T12:00:00.000Z', 'PIX QRS UBER DO BRA09/02', 'Transferência', -18.94, 'ArrowLeftRight', now(), '572482575c3c5d845c14dd060ee0f3837446dc0484c941d28187415430fdf2e1', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-03T12:00:00.000Z', 'IOF', 'Outros', -1.42, 'Circle', now(), '040c30ff248074d15dd445284302e1a144c2318822fe7a12fa9a6480da3ee73e', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-02T12:00:00.000Z', 'RESGATE CDB Cofrinhos', 'Rendimentos', 770, 'TrendingUp', now(), 'fcb357dd8e40a702850b5730f7548c0c0a25337c1f4f3138b8a3e1ecfd09c772', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-02T12:00:00.000Z', 'PAG TIT INT 033', 'Outros', -522.43, 'Circle', now(), '168cf10d4041ff85ad43a53a35bf52e0fdfcba195dc4e7b3ffac1635759c5abf', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-02-02T12:00:00.000Z', 'JUROS LIMITE DA CONTA', 'Rendimentos', -16.49, 'TrendingUp', now(), '3aa89c77ff3224f0314bf3e582ca8a59d818380008712ad9e687feb7dcd466d3', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-30T12:00:00.000Z', 'REMUNERACAO/SALARIO', 'Salário', 1646.11, 'Wallet', now(), '48c6315fddd6b91df07cc7715cea710a8f7fc26bf9bce3877778d451678010aa', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-30T12:00:00.000Z', 'FATURA PAGA ITAU MULTIPL', 'Cartão', -1362.27, 'CreditCard', now(), '50b9951744cfec244d2db4616cc8b7bf802bfabd0cd3f2b048f859ab104c3b8a', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-30T12:00:00.000Z', 'FATURA PAGA ITAU PLATINU', 'Cartão', -25.7, 'CreditCard', now(), '4a2dfea505303ee69db70d2340aff56ae0bf6e876065b1073a955ffa4f487fe8', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-12T12:00:00.000Z', 'PIX TRANSF Guilher10/01', 'Transferência', -100, 'ArrowLeftRight', now(), 'd611e1716c74bee393769de3670504fda7cca2a5e7126c40803ec64e510591ba', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-05T12:00:00.000Z', 'PAY IKESA 03/01', 'Outros', -27.47, 'Circle', now(), '5e7fd40aa7c7be990b20c94931ef948dd6030c327a4dbd134df0a06958bc6c96', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-05T12:00:00.000Z', 'PAG BOLETO ASSUPERO ENSINO SUPERIOR LTDA', 'Boleto', -522.43, 'FileText', now(), '92a40dbe736a155a63e3d9e65a738aac9a1c093e7acbe8e28896c1ada844b31e', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-05T12:00:00.000Z', 'REND PAGO APLIC AUT MAIS', 'Outros', 0.01, 'Circle', now(), 'a96e0500df2af7e06c35d72287b9debae908679ee3d571c7fcf9b944c939e914', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-05T12:00:00.000Z', 'IOF', 'Outros', -0.03, 'Circle', now(), 'bb10eb937a7ebf97ad160c19678ef6cb92a8ac4433353fc09ed936c443cb6f65', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

INSERT INTO public.transactions (id, user_id, date, description, category, amount, icon, created_at, source_hash, source_type) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', '2026-01-02T12:00:00.000Z', 'PAY ANDER 02/01', 'Outros', -40, 'Circle', now(), 'b84c5cbcfbe1da680acf6be4b9779ca40de99e4fd80b09126eda842e59437a17', 'pdf')
ON CONFLICT (user_id, source_hash) WHERE source_hash IS NOT NULL DO NOTHING;

-- Atualizar saldos para o usuário
DELETE FROM public.balances WHERE user_id = '4ae31623-b7ba-4b09-89b7-beab24b10325';

INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', 'Saldo Total', -374.3299999999999, '+0.0%', 'Wallet', 'total', now());

INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', 'Receitas', 7870.370000000001, '+0.0%', 'ArrowUpCircle', 'income', now());

INSERT INTO public.balances (id, user_id, label, amount, trend, icon, type, created_at) 
VALUES (gen_random_uuid(), '4ae31623-b7ba-4b09-89b7-beab24b10325', 'Despesas', 8244.699999999999, '+0.0%', 'ArrowDownCircle', 'expense', now());

-- Log de sincronização
INSERT INTO public.itau_sync_logs (user_id, status, file_name, source_type, records_synced, records_total, records_duplicate, records_error, created_at) 
VALUES ('4ae31623-b7ba-4b09-89b7-beab24b10325', 'success', 'itau_extrato_012026.pdf', 'pdf', 68, 68, 0, 0, now());

COMMIT;
