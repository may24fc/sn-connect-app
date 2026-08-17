-- Migration: Import marketing ad spend historical data
-- Generated from: supabase/migrations/ads data
-- Created: 2026-08-17

BEGIN;

-- Ensure invoice file name column exists for link label display in UI
ALTER TABLE public.marketing_entries
  ADD COLUMN IF NOT EXISTS invoice_file_name text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION 'Cannot import ad spend data: auth.users is empty.';
  END IF;
END $$;

INSERT INTO public.marketing_platforms (name, code, is_active, deleted_at)
VALUES
  ('Meta Ads', 'meta', true, NULL),
  ('Google Ads', 'google', true, NULL),
  ('Email Marketing', 'email', true, NULL)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = true,
  deleted_at = NULL,
  updated_at = now();

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.marketing_platforms
    WHERE code IN ('meta', 'google', 'email')
      AND deleted_at IS NULL
  ) <> 3 THEN
    RAISE EXCEPTION 'Import guard failed: expected 3 active marketing platforms (meta/google/email) before entry import.';
  END IF;
END $$;

WITH raw_entries(platform_code, entry_date, transaction_id, payment_method, amount, invoice_file_name, invoice_reference) AS (
  VALUES
  ('meta', '2026-08-10'::date, '28222360107453303-28358477503841563', 'American Express **** 1005', 491.70::numeric(12,2), '2026-08-10T14-24 Transaction #28222360107453303-28358477503841563.pdf', 'https://drive.google.com/file/d/1ss9eYp3ikW6OF0g5rR7e1d-zXIRKkb84/view?usp=sharing'),
  ('meta', '2026-08-07'::date, '28330690009953648-28139266969095953', 'American Express **** 1005', 491.70::numeric(12,2), '2026-08-07T16-43 Transaction #28330690009953648-28139266969095953.pdf', 'https://drive.google.com/file/d/1Lng5eh_dWi6_AJFaisvaLqi65V8bnKpf/view?usp=sharing'),
  ('meta', '2026-08-04'::date, '28275836712105643-28153062541049731', 'American Express **** 1005', 491.70::numeric(12,2), '2026-08-04T12-21 Transaction #28275836712105643-28153062541049731.pdf', 'https://drive.google.com/file/d/1TnI9QCVC7zmefOF4YV67HPZyZ8jMjjcc/view?usp=sharing'),
  ('meta', '2026-08-01'::date, '28124648927224428-28230279599994686', 'American Express **** 1005', 491.70::numeric(12,2), '2026-08-01T13-16 Transaction #28124648927224428-28230279599994686.pdf', 'https://drive.google.com/file/d/16KoviLNPTk_habQFF2DZil3KEz0L3G2w/view?usp=sharing'),
  ('meta', '2026-07-29'::date, '28075724625450190-28083178051371516', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-29T08-52 Transaction #28075724625450190-28083178051371516.pdf', 'https://drive.google.com/file/d/1rZ3WQprUpW4XNJiHyLRvqdTJU4KjMCXE/view?usp=sharing'),
  ('meta', '2026-07-26'::date, '28172189012470416-27901618819527432', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-26T11-10 Transaction #28172189012470416-27901618819527432.pdf', 'https://drive.google.com/file/d/1bxdhkLYjObhSJ_jxIM9FxHRza_Dal70h/view?usp=sharing'),
  ('meta', '2026-07-23'::date, '28131416123214372-28131416156547702', 'American Express **** 1005', 251.38::numeric(12,2), '2026-07-23T06-50 Transaction #28131416123214372-28131416156547702.pdf', 'https://drive.google.com/file/d/1p5jpKfsVpqxQg61TUj2MIOKko7B0I7rG/view?usp=sharing'),
  ('meta', '2026-07-21'::date, '27983779197978069-27911598881862767', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-21T13-12 Transaction #27983779197978069-27911598881862767.pdf', 'https://drive.google.com/file/d/1OHIXE5VZWGQmRAq9D1EpkLMxpv2S9OBz/view?usp=sharing'),
  ('meta', '2026-07-18'::date, '27878112865211369-27878112928544696', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-18T16-18 Transaction #27878112865211369-27878112928544696.pdf', 'https://drive.google.com/file/d/1d4VlNqC7hL-X2GyGcpAKIVlR3CltxWwh/view?usp=sharing'),
  ('meta', '2026-07-15'::date, '28101911672831479-27904640992558555', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-15T13-43 Transaction #28101911672831479-27904640992558555.pdf', 'https://drive.google.com/file/d/1gERlMmePOqfTwcg5iozu0spWVx0tW4zY/view?usp=sharing'),
  ('meta', '2026-07-12'::date, '28070727005949946-27881136194909037', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-12T20-31 Transaction #28070727005949946-27881136194909037.pdf', 'https://drive.google.com/file/d/1BGEV4lWn1aTdQdqnAdS2YGWbwBSrgUol/view?usp=sharing'),
  ('meta', '2026-07-09'::date, '27951404537882195-27782232491466071', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-09T20-38 Transaction #27951404537882195-27782232491466071.pdf', 'https://drive.google.com/file/d/1fw131OV6PzFbaE3cbz-gMHFWiCmZburc/view?usp=sharing'),
  ('meta', '2026-07-07'::date, '27921729227516393-27752709864418334', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-07T06-15 Transaction #27921729227516393-27752709864418334.pdf', 'https://drive.google.com/file/d/1Bmj8DyX_WNCAekiPvBVP-pf2SvdC-mIc/view?usp=sharing'),
  ('meta', '2026-07-04'::date, '27888418797514103-27713022841720373', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-04T12-13 Transaction #27888418797514103-27713022841720373.pdf', 'https://drive.google.com/file/d/1L_dti42aOceMzhnZkrVWMey51gO5-U6m/view?usp=sharing'),
  ('meta', '2026-07-01'::date, '27852092007813449-27741090615580261', 'American Express **** 1005', 491.70::numeric(12,2), '2026-07-01T13-24 Transaction #27852092007813449-27741090615580261.pdf', 'https://drive.google.com/file/d/1SDIfUPjusVKmY-oZ2ZGtnKllaq5YYoDf/view?usp=sharing'),
  ('meta', '2026-06-28'::date, '27641873568835301-27692840160405303', 'American Express **** 1005', 491.70::numeric(12,2), '2026-06-28T19-52 Transaction #27641873568835301-27692840160405303.pdf', 'https://drive.google.com/file/d/1fWgqv_4hq7eFaMLMqCC-UjVvy5MR2KOf/view?usp=sharing'),
  ('meta', '2026-06-25'::date, '27676377005384958-27669224512766872', 'American Express **** 1005', 491.70::numeric(12,2), '2026-06-25T19-32 Transaction #27676377005384958-27669224512766872.pdf', 'https://drive.google.com/file/d/11MW64yl_fe6Hpb3Ktggh23krG2P9a2OY/view?usp=sharing'),
  ('meta', '2026-06-23'::date, '27580583618297627-27499992359690082', 'American Express **** 1005', 96.09::numeric(12,2), '2026-06-23T06-25 Transaction #27580583618297627-27499992359690082.pdf', 'https://drive.google.com/file/d/1E2XID6SduM1frzP8TQyIC4noyrZDM2tz/view?usp=sharing'),
  ('meta', '2026-06-22'::date, '27491440573878594-27491440643878587', 'American Express **** 1005', 491.70::numeric(12,2), '2026-06-22T14-29 Transaction #27491440573878594-27491440643878587.pdf', 'https://drive.google.com/file/d/1i3h-XFtYzGMXJEnhDLrN9Ky1K6z0A8vC/view?usp=sharing'),
  ('meta', '2026-06-20'::date, '27792387663783883-27539737612382228', 'American Express **** 1005', 316.29::numeric(12,2), '2026-06-20T01-13 Transaction #27792387663783883-27539737612382228.pdf', 'https://drive.google.com/file/d/1-3Hq8zAj-oj-DxRh9BX-ooQNW-7KTTr9/view?usp=sharing'),
  ('meta', '2026-06-18'::date, '27512013091821347-27692379953784658', 'American Express **** 1005', 491.70::numeric(12,2), '2026-06-18T01-41 Transaction #27512013091821347-27692379953784658.pdf', 'https://drive.google.com/file/d/1tXQO94D69mOZHAp1hEy9quevhTj5qPGQ/view?usp=sharing'),
  ('meta', '2026-06-15'::date, '27535908112765180-27518082044547783', 'American Express **** 1005', 491.70::numeric(12,2), '2026-06-15T11-45 Transaction #27535908112765180-27518082044547783.pdf', 'https://drive.google.com/file/d/1rlrABNO3NtB6LCdNNfARBEO_S1ZJM9ez/view?usp=sharing'),
  ('meta', '2026-06-12'::date, '27480068611682460-27433354869687173', 'American Express **** 1005', 160.60::numeric(12,2), '2026-06-12T15-31 Transaction #27480068611682460-27433354869687173.pdf', 'https://drive.google.com/file/d/17YiRmbHHQEJolR1StHksstx8KQRtIyuo/view?usp=sharing'),
  ('meta', '2026-06-11'::date, '27425419087147415-27678616981827619', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-11T16-42 Transaction #27425419087147415-27678616981827619.pdf', 'https://drive.google.com/file/d/1xuVONaE2TzOrICfPbZaPxTHVvN0gpBYx/view?usp=sharing'),
  ('meta', '2026-06-10'::date, '27580377378318248-27331826883173298', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-10T16-46 Transaction #27580377378318248-27331826883173298.pdf', 'https://drive.google.com/file/d/1tx-l8dfxDIjlLjWcNkQFOGIIN9CCeNDI/view?usp=sharing'),
  ('meta', '2026-06-09'::date, '27393889830300341-27574911192198202', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-09T10-48 Transaction #27393889830300341-27574911192198202.pdf', 'https://drive.google.com/file/d/1x9D8zsL-CYTP3TkLzmLweOPL7yE9OrU7/view?usp=sharing'),
  ('meta', '2026-06-08'::date, '27381358971553427-27440307385658587', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-08T09-32 Transaction #27381358971553427-27440307385658587.pdf', 'https://drive.google.com/file/d/1U9raOjmpVov20nQ5KoT3_aE1VOpZyT0G/view?usp=sharing'),
  ('meta', '2026-06-07'::date, '27425027830519876-27407042572318398', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-07T03-29 Transaction #27425027830519876-27407042572318398.pdf', 'https://drive.google.com/file/d/1Yh4cMk_XH-TQirxcnnsUI3B11uI4uuBx/view?usp=sharing'),
  ('meta', '2026-06-05'::date, '27268771509478836-27529180963437892', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-05T20-56 Transaction #27268771509478836-27529180963437892.pdf', 'https://drive.google.com/file/d/1I7R6BJD46VVSfUhKG_8JHqMQwVNPXf1e/view?usp=sharing'),
  ('meta', '2026-06-04'::date, '27373079949047994-27584628274559824', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-04T17-37 Transaction #27373079949047994-27584628274559824.pdfg', 'https://drive.google.com/file/d/1TG_Tk6NSG7v9cPMJifCvMPfCLvUi3OaM/view?usp=sharing'),
  ('meta', '2026-06-03'::date, '27381874018168593-27568369479519037', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-03T13-57 Transaction #27381874018168593-27568369479519037.pdf', 'https://drive.google.com/file/d/1eA8yNbwCdcoyluA_bbESHr7i5-wuY78T/view?usp=sharing'),
  ('meta', '2026-06-02'::date, '27485608551128469-27485608611128463', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-02T10-24 Transaction #27485608551128469-27485608611128463.pdf', 'https://drive.google.com/file/d/1jP2WXG4hS4iq4Tq6IAIVKWrAJgRkIrYz/view?usp=sharing'),
  ('meta', '2026-06-01'::date, '27470580902631234-27283090468046945', 'American Express **** 1005', 202.40::numeric(12,2), '2026-06-01T09-49 Transaction #27470580902631234-27283090468046945.pdf', 'https://drive.google.com/file/d/1z0xr531H042EY9dlJYbvASIpWDTpr0DQ/view?usp=sharing'),
  ('meta', '2026-05-31'::date, '27189142814108373-27437427722613215', 'American Express **** 1005', 202.40::numeric(12,2), '2026-05-31T08-18 Transaction #27189142814108373-27437427722613215.pdf', 'https://drive.google.com/file/d/19kktZLHcYSwzTqH1L9Eb_PG2RUBE4zLJ/view?usp=sharing'),
  ('meta', '2026-05-29'::date, '27239192355770093-27165792443110077', 'American Express **** 1005', 202.40::numeric(12,2), '2026-05-29T20-25 Transaction #27239192355770093-27165792443110077.pdf', 'https://drive.google.com/file/d/1ic7lqKYMj4cBti7ExdKhXnkOrkY9N7Q1/view?usp=sharing'),
  ('meta', '2026-05-28'::date, '27149527454736576-27269644162724907', 'American Express **** 1005', 202.40::numeric(12,2), '2026-05-28T18-22 Transaction #27149527454736576-27269644162724907.pdf', 'https://drive.google.com/file/d/1gC0zEuOnDY_sDaPCYaj11XtaJ_6HwtgZ/view?usp=sharing'),
  ('meta', '2026-05-27'::date, '27252941534395170-27206285515727444', 'American Express **** 1005', 202.40::numeric(12,2), '2026-05-27T15-36 Transaction #27252941534395170-27206285515727444.pdf', 'https://drive.google.com/file/d/1fKmGDVVCNIsmPD0bbjNs1XxGMBrE32xs/view?usp=sharing'),
  ('meta', '2026-05-26'::date, '27191076993914963-27191077077248288', 'American Express **** 1005', 202.40::numeric(12,2), '2026-05-26T12-22 Transaction #27191076993914963-27191077077248288.pdf', 'https://drive.google.com/file/d/1gN2sJxRbrX9N82aqBaAbTxu3sniBFJUZ/view?usp=sharing'),
  ('meta', '2026-05-25'::date, '27353696320986356-27353696397653015', 'American Express **** 1005', 202.40::numeric(12,2), '2026-05-25T11-07 Transaction #27353696320986356-27353696397653015.pdf', 'https://drive.google.com/file/d/1Ne27vjVqRHrW4lXAcBwajqVxUzmhec7x/view?usp=sharing'),
  ('meta', '2026-05-24'::date, '27231544963201498-27231545043201490', 'American Express **** 1005', 202.40::numeric(12,2), '2026-05-24T09-52 Transaction #27231544963201498-27231545043201490.pdf', 'https://drive.google.com/file/d/16bbxg5GlEqP9Ae-tRQnkuZk_ioD5n4SH/view?usp=sharing'),
  ('meta', '2026-05-23'::date, '27328868936802428-27411069555249031', 'American Express **** 1005', 135.21::numeric(12,2), '2026-05-23T06-58 Transaction #27328868936802428-27411069555249031.pdf', 'https://drive.google.com/file/d/1YI41cIF9LEOla9KPDgQKWgGFLlOsxW_R/view?usp=sharing'),
  ('meta', '2026-05-22'::date, '27317815657907756-27335396506149675', 'American Express **** 1005', 202.40::numeric(12,2), '2026-05-22T09-21 Transaction #27317815657907756-27335396506149675.pdf', 'https://drive.google.com/file/d/1S_fCS-P7RgQSk_Nv1DetBJfzcYemeLwH/view?usp=sharing'),
  ('meta', '2026-05-20'::date, '27124531283902868-27316822164673776', 'American Express **** 1005', 155.10::numeric(12,2), '2026-05-20T21-52 Transaction #27124531283902868-27316822164673776.pdf', 'https://drive.google.com/file/d/1SvBMJbfNUjgqXcAyPMfihQafHNvG_pMP/view?usp=sharing'),
  ('meta', '2026-05-20'::date, '27038030822552907-27116307168058610', 'American Express **** 1005', 160.60::numeric(12,2), '2026-05-20T00-28 Transaction #27038030822552907-27116307168058610.pdf', 'https://drive.google.com/file/d/1c6AIFMkppQ7-n3S_pAIk-qGtzKuTYpzc/view?usp=sharing'),
  ('meta', '2026-05-19'::date, '27147278248294833-27165511816471480', 'American Express **** 1005', 166.10::numeric(12,2), '2026-05-19T04-51 Transaction #27147278248294833-27165511816471480.pdf', 'https://drive.google.com/file/d/1pKE5LYZncI96c2FUUy4ZWLsOIaBAgP2-/view?usp=sharing'),
  ('meta', '2026-05-18'::date, '27282087601480566-27095131350176192', 'American Express **** 1005', 191.40::numeric(12,2), '2026-05-18T10-03 Transaction #27282087601480566-27095131350176192.pdf', 'https://drive.google.com/file/d/1PfjqrOnlAeoxv_26fV50lOJLaX4u8MNf/view?usp=sharing'),
  ('meta', '2026-05-17'::date, '27081894858166508-27251386511217338', 'American Express **** 1005', 191.40::numeric(12,2), '2026-05-17T10-15 Transaction #27081894858166508-27251386511217338.pdf', 'https://drive.google.com/file/d/1oShuHWbxSBN7JlVkKv05WHOqtLFBhHZN/view?usp=sharing'),
  ('meta', '2026-05-16'::date, '27107097672312891-27125291813826814', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-16T06-12 Transaction #27107097672312891-27125291813826814.pdf', 'https://drive.google.com/file/d/1gtxgnpLSFcSTf9Q59lvj5DfppVFTPiW4/view?usp=sharing'),
  ('meta', '2026-05-15'::date, '27230194976669825-26982735191415804', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-15T23-02 Transaction #27230194976669825-26982735191415804.pdf', 'https://drive.google.com/file/d/13OxZY9QxKtnoyjvVVv9d3KSiPcIdyhRQ/view?usp=sharing'),
  ('meta', '2026-05-15'::date, '27241689332187058-27059024727120188', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-15T20-36 Transaction #27241689332187058-27059024727120188.pdf', 'https://drive.google.com/file/d/1TgepNrDocjbbpsDTEIW4Lkb7xo63d1CU/view?usp=sharing'),
  ('meta', '2026-05-15'::date, '27052314271124570-27124213167268014', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-15T17-59 Transaction #27052314271124570-27124213167268014.pdf', 'https://drive.google.com/file/d/1Gfwef539KuSd49oSFudbsR2TRKmRlTCO/view?usp=sharing'),
  ('meta', '2026-05-15'::date, '26978347088521281-26978347188521271', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-15T16-04 Transaction #26978347088521281-26978347188521271.pdf', 'https://drive.google.com/file/d/16U-ZkMDe6cZ4YPRyY08nU7BSwEzdBjMv/view?usp=sharing'),
  ('meta', '2026-05-15'::date, '27049988214690509-27121900154165982', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-15T14-03 Transaction #27049988214690509-27121900154165982.pdf', 'https://drive.google.com/file/d/1G3D_-mGSgOZqh8WALq2PmfmgBPZorKd8/view?usp=sharing'),
  ('meta', '2026-05-15'::date, '27048461318176532-27223061584049831', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-15T11-28 Transaction #27048461318176532-27223061584049831.pdf', 'https://drive.google.com/file/d/1KiZwYM2r2dddajNri5uDfmp2gWof61US/view?usp=sharing'),
  ('meta', '2026-05-15'::date, '27118535897835741-26973802465642410', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-15T08-18 Transaction #27118535897835741-26973802465642410.pdf', 'https://drive.google.com/file/d/11lXiB-kPIbGb1KkL7Z2f-lkQYPJElkW6/view?usp=sharing'),
  ('meta', '2026-05-14'::date, '27105798489109480-27105798602442802', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-14T23-36 Transaction #27105798489109480-27105798602442802.pdf', 'https://drive.google.com/file/d/1L_u9S0U9vXBSCF0GiCpZFF3DJSqC7d5x/view?usp=sharing'),
  ('meta', '2026-05-14'::date, '27044670748555586-26966796619676328', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-14T21-22 Transaction #27044670748555586-26966796619676328.pdf', 'https://drive.google.com/file/d/1Y2c_9Ri77yRmLCHTNpgGA1ESzY7obVeh/view?usp=sharing'),
  ('meta', '2026-05-14'::date, '27230282433327750-27043429908679670', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-14T19-23 Transaction #27230282433327750-27043429908679670.pdf', 'https://drive.google.com/file/d/1K3PKNWRLnzC9T_koVbhLQvzrxOAgCZHR/view?usp=sharing'),
  ('meta', '2026-05-14'::date, '27292802197075768-27108408578848473', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-14T16-24 Transaction #27292802197075768-27108408578848473.pdf', 'https://drive.google.com/file/d/1d2jqKcGastBq6zTiTiKxdqYyci7FbSt8/view?usp=sharing'),
  ('meta', '2026-05-14'::date, '27040626342293360-27082056088150383', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-14T14-39 Transaction #27040626342293360-27082056088150383.pdf', 'https://drive.google.com/file/d/12f3eRMfNihkYbKmwaIQ7-7me4rGrZGNS/view?usp=sharing'),
  ('meta', '2026-05-14'::date, '27208611222161534-27225971007092226', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-14T12-00 Transaction #27208611222161534-27225971007092226.pdf', 'https://drive.google.com/file/d/1S_ot-Ww-0OAGcERuJ7Xie5W-j2H3WkGm/view?usp=sharing'),
  ('meta', '2026-05-14'::date, '27206992945656695-27288628674159787', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-14T09-04 Transaction #27206992945656695-27288628674159787.pdf', 'https://drive.google.com/file/d/1WqdDWEeMiJdso4lWzY0DvVHoZziYRMhA/view?usp=sharing'),
  ('meta', '2026-05-14'::date, '27201744679514855-27027229280299736', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-14T00-22 Transaction #27201744679514855-27027229280299736.pdf', 'https://drive.google.com/file/d/1muBozSRuJPP5UexaPF57kY8OZFTmBpKm/view?usp=sharing'),
  ('meta', '2026-05-13'::date, '27025223830500281-27071713795851279', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-13T21-07 Transaction #27025223830500281-27071713795851279.pdfg', 'https://drive.google.com/file/d/1pXMueNdJb27yRI2jEAfNj4ypm8aZFGf1/view?usp=sharing'),
  ('meta', '2026-05-13'::date, '27024420760580588-27070914945931164', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-13T19-45 Transaction #27024420760580588-27070914945931164.pdf', 'https://drive.google.com/file/d/113-M6Oed5XQ-2mokakMOR1vS9FlkvAAO/view?usp=sharing'),
  ('meta', '2026-05-13'::date, '27069497822739543-27210766855279306', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-13T17-40 Transaction #27069497822739543-27210766855279306.pdf', 'https://drive.google.com/file/d/1q4Yeb9by0VPnBTZ3n0SzaRqhAQp-DZ2Z/view?usp=sharing'),
  ('meta', '2026-05-13'::date, '27213629228326404-27213629328326394', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-13T15-47 Transaction #27213629228326404-27213629328326394.pdfg', 'https://drive.google.com/file/d/1uy39X4kvp9_nPXAw3eQdIA_mvfIxi42P/view?usp=sharing'),
  ('meta', '2026-05-13'::date, '27020538980968766-27067010426321616', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-13T13-18 Transaction #27020538980968766-27067010426321616.pdf', 'https://drive.google.com/file/d/1y8C9TANVsxSXp5zaAzZtDF6I5CY76jes/view?usp=sharing'),
  ('meta', '2026-05-13'::date, '27193491850340138-27065463106476348', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-13T10-20 Transaction #27193491850340138-27065463106476348.pdf', 'https://drive.google.com/file/d/1Sa7hszmKEemlZYUiW0ROWKS_Vlwhmg68/view?usp=sharing'),
  ('meta', '2026-05-13'::date, '27089414974081167-26944898908532766', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-13T07-30 Transaction #27089414974081167-26944898908532766.pdf', 'https://drive.google.com/file/d/1hLDRs0_BbhxTOBpXkH5_9z2Wy_nTNcA0/view?usp=sharing'),
  ('meta', '2026-05-13'::date, '27078095775213085-27085080541181277', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-13T00-29 Transaction #27078095775213085-27085080541181277.pdf', 'https://drive.google.com/file/d/15toBXnTsBl5C0e8bLyuYe_sKphg3K5f-/view?usp=sharing'),
  ('meta', '2026-05-12'::date, '27267539589602029-27199205029768822', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-12T21-20 Transaction #27267539589602029-27199205029768822.pdf', 'https://drive.google.com/file/d/1mO-jc-K_unt028gPthFKImQd-0L2UY-8/view?usp=sharing'),
  ('meta', '2026-05-12'::date, '27202489782773682-27185157521173571', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-12T20-08 Transaction #27202489782773682-27185157521173571.pdf', 'https://drive.google.com/file/d/17qVcZBbpPK-_ckj6bc3KfvitrYLLLeUM/view?usp=sharing'),
  ('meta', '2026-05-12'::date, '27080869374935727-27014125811610080', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-12T17-23 Transaction #27080869374935727-27014125811610080.pdf', 'https://drive.google.com/file/d/1WrBuCWHjFbDzeSVbtCUV7zXY2C0decr8/view?usp=sharing'),
  ('meta', '2026-05-12'::date, '27008381602184504-27182784304744226', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-12T15-55 Transaction #27008381602184504-27182784304744226.pdf', 'https://drive.google.com/file/d/1KnEaTDPeVxxurvcy58CtLJwFjsl8DNUJ/view?usp=sharing'),
  ('meta', '2026-05-12'::date, '27198722029817124-27198722113150449', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-12T13-26 Transaction #27198722029817124-27198722113150449.pdf', 'https://drive.google.com/file/d/1Cf2cNyVhRf4USTUtGyVZGY_2y9q-aWup/view?usp=sharing'),
  ('meta', '2026-05-12'::date, '26932800716409252-27010500051972656', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-12T10-49 Transaction #26932800716409252-27010500051972656.pdf', 'https://drive.google.com/file/d/1mdnMympCcXwE6NUciqaheG2s6HbZx45f/view?usp=sharing'),
  ('meta', '2026-05-12'::date, '27076277075394957-27196326736723320', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-12T08-59 Transaction #27076277075394957-27196326736723320.pdf', 'https://drive.google.com/file/d/1gM75xB7LbpBgHhgbXAYQIH0_IAM_dFw2/view?usp=sharing'),
  ('meta', '2026-05-12'::date, '27002675049421826-27049092504780075', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-12T05-30 Transaction #27002675049421826-27049092504780075.pdf', 'https://drive.google.com/file/d/1tg-HctADlybA1puEjlzwQtySfAbhwBf-/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '27062972193392110-26925600220462635', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T22-35 Transaction #27062972193392110-26925600220462635.pdf', 'https://drive.google.com/file/d/1RgixjvnPIXrIHu_IHyk1E2eW1JHAOyJR/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '27171662789189711-27185125801176745', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T20-50 Transaction #27171662789189711-27185125801176745.pdf', 'https://drive.google.com/file/d/121Qc3FGiAqXT0F0DIttqDZkzuym8ueah/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '26923140380708619-27251888774500444', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T18-05 Transaction #26923140380708619-27251888774500444.pdf', 'https://drive.google.com/file/d/1On6XyP863VgWbgmtUAW2PrGRosDrOOYa/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '27041623502193642-27000170636338931', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T16-44 Transaction #27041623502193642-27000170636338931.pdf', 'https://drive.google.com/file/d/1E8tC5iG1Ilz_cm0M6GVwr_2A4C5HJBro/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '27185772291112098-27040510532304939', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T14-25 Transaction #27185772291112098-27040510532304939.pdf', 'https://drive.google.com/file/d/18a7wCmTJ94H3D2PvlI7BR9Boa8IvU0jA/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '26998217499867578-26998217569867571', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T12-38 Transaction #26998217499867578-26998217569867571.pdf', 'https://drive.google.com/file/d/1U01EOjpEHr0PcX6UPADj-juq0lWjp8VS/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '27179785605044098-27179785645044094', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T09-53 Transaction #27179785605044098-27179785645044094.pdf', 'https://drive.google.com/file/d/1Cic959iprzQF8Cmtr79GdG1rvg_kHJtC/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '27247529838269671-27183178604704800', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T08-51 Transaction #27247529838269671-27183178604704800.pdf', 'https://drive.google.com/file/d/1gQns-BvhnNTOkcYNuYHF2aA_d2-78t6h/view?usp=sharing'),
  ('meta', '2026-05-11'::date, '27060474746975190-26916073708081953', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-11T03-10 Transaction #27060474746975190-26916073708081953.pdf', 'https://drive.google.com/file/d/1uMEHw_rG2VoJdR8FCVmI2pu2y4fmL9BR/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '26985422724480392-27057095920646406', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T21-29 Transaction #26985422724480392-27057095920646406.pdf', 'https://drive.google.com/file/d/108uauObAP1jFd7v2nBEw-AbHWefi2P9B/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '27055769230779075-27240016835687638', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T18-56 Transaction #27055769230779075-27240016835687638.pdf', 'https://drive.google.com/file/d/1aXzKREZ9zfy0dVLMR_knX6XpUObhyZ37/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '26983152608040737-27047817158240947', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T17-04 Transaction #26983152608040737-27047817158240947.pdf', 'https://drive.google.com/file/d/12kvqvmPM4SUQn9vrf2zvUZsdAscZWpwD/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '27238095722546416-27170013452687980', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T15-05 Transaction #27238095722546416-27170013452687980.pdf', 'https://drive.google.com/file/d/1F6melgp3YZz5e8YZ68uHvzKieO3UNasc/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '26908218352200822-27027328870289772', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T12-36 Transaction #26908218352200822-27027328870289772.pdf', 'https://drive.google.com/file/d/1DWbVCL2em8jiLLzHbo7YYUhry0TTikA7/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '27171285269227467-27153977547624902', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T09-56 Transaction #27171285269227467-27153977547624902.pdf', 'https://drive.google.com/file/d/1kJx7su1oBchY1hxfawn_sqfR9ZEuvDD8/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '27050745521281446-27050745601281438', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T08-23 Transaction #27050745521281446-27050745601281438.pdf', 'https://drive.google.com/file/d/1RYkVzobABMPQZLTHGFMFzIIB75g2zqf_/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '26905883982434259-26905884015767589', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T07-18 Transaction #26905883982434259-26905884015767589.pdf', 'https://drive.google.com/file/d/182b_QzEbwuk9ag-q8FE4sSiOwagCeBhv/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '27022677474088245-27167835962905731', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T02-39 Transaction #27022677474088245-27167835962905731.pdf', 'https://drive.google.com/file/d/1eK78o5bRprjfvoZnXfFbFW-I9OkGCRy4/view?usp=sharing'),
  ('meta', '2026-05-10'::date, '27162606980095294-27148945738128083', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-10T00-03 Transaction #27162606980095294-27148945738128083.pdf', 'https://drive.google.com/file/d/1378lgfY8JMrCUs1yIICbge6b5jZVq83X/view?usp=sharing'),
  ('meta', '2026-05-09'::date, '27044658915223440-27037694849253178', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-09T21-23 Transaction #27044658915223440-27037694849253178.pdf', 'https://drive.google.com/file/d/1Q1GGl4QJxZYZixCr6Te-WdACfpwGatjR/view?usp=sharing'),
  ('meta', '2026-05-09'::date, '27159284580427534-27043083462047652', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-09T18-26 Transaction #27159284580427534-27043083462047652.pdf', 'https://drive.google.com/file/d/1xDXSYnYxEOpLMHc_XF3k0K-U_D26PF3n/view?usp=sharing'),
  ('meta', '2026-05-09'::date, '27161689940187000-27041818695507462', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-09T15-56 Transaction #27161689940187000-27041818695507462.pdf', 'https://drive.google.com/file/d/1rapGzxupZDMYNnzQkLCLDN9Tp5EDo5RA/view?usp=sharing'),
  ('meta', '2026-05-09'::date, '26969066919449306-27033730516316278', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-09T13-34 Transaction #26969066919449306-27033730516316278.pdf', 'https://drive.google.com/file/d/1VIMF5pqrxn2U-vWmUNwxXXKa-De1Ri9T/view?usp=sharing'),
  ('meta', '2026-05-09'::date, '26972909492398379-27142146552141335', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-09T11-23 Transaction #26972909492398379-27142146552141335.pdf', 'https://drive.google.com/file/d/17F1UrYUa98NDKJ8VlqTjDYxPuCQR8ClW/view?usp=sharing'),
  ('meta', '2026-05-09'::date, '27155010740854918-27013529995002993', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-09T09-42 Transaction #27155010740854918-27013529995002993.pdf', 'https://drive.google.com/file/d/1vZJIAK1icDzktz7eRve_OHqQcJR_Iaog/view?usp=sharing'),
  ('meta', '2026-05-09'::date, '27140237955665528-27037731542582844', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-09T07-25 Transaction #27140237955665528-27037731542582844.pdf', 'https://drive.google.com/file/d/1-dWj7ZxvST9LnORkOs5nbs6hrUUGSJHO/view?usp=sharing'),
  ('meta', '2026-05-09'::date, '26890292543993403-27027737810248882', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-09T02-12 Transaction #26890292543993403-27027737810248882.pdf', 'https://drive.google.com/file/d/1e47KLzuvD-Nfxd10Psr_kilhFimmUO24/view?usp=sharing'),
  ('meta', '2026-05-08'::date, '26887474127608578-26960258980330100', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-08T21-35 Transaction #26887474127608578-26960258980330100.pdf', 'https://drive.google.com/file/d/1Jj1zK4PXwYYHEskkUQ7954Mds4IItEi3/view?usp=sharing'),
  ('meta', '2026-05-08'::date, '27133072569715400-27150499407972720', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-08T19-30 Transaction #27133072569715400-27150499407972720.pdf', 'https://drive.google.com/file/d/1aQzw9wbyMKVAIeU_SUPDVY1yLLIXUviy/view?usp=sharing'),
  ('meta', '2026-05-08'::date, '27149283268094334-26957825747240090', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-08T17-19 Transaction #27149283268094334-26957825747240090.pdf', 'https://drive.google.com/file/d/12csmmbEMKUgTC4zJoU_KWM7_iL2r7orc/view?usp=sharing'),
  ('meta', '2026-05-08'::date, '27028426946846637-26956871780668820', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-08T15-37 Transaction #27028426946846637-26956871780668820.pdf', 'https://drive.google.com/file/d/1gw7NkU7F3lVhmOyNk5Sv4NT4whDuWTez/view?usp=sharing'),
  ('meta', '2026-05-08'::date, '27143229965366329-27211293268559995', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-08T13-09 Transaction #27143229965366329-27211293268559995.pdf', 'https://drive.google.com/file/d/1TaTfxs2f3Il6pmr0H32c5Yjh1oFg4szA/view?usp=sharing'),
  ('meta', '2026-05-08'::date, '27127363056953018-27144788818543779', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-08T09-26 Transaction #27127363056953018-27144788818543779.pdf', 'https://drive.google.com/file/d/1N5b4t1WdDNJQLuv36rZsLDIHI4x_wo-l/view?usp=sharing'),
  ('meta', '2026-05-08'::date, '27019674297721902-27012800185075978', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-08T00-46 Transaction #27019674297721902-27012800185075978.pdf', 'https://drive.google.com/file/d/105VH-Chj0mKTaLdyHq5uZQ8o-P7jIzrV/view?usp=sharing'),
  ('meta', '2026-05-07'::date, '26873175402371784-27201672069522115', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-07T21-27 Transaction #26873175402371784-27201672069522115.pdf', 'https://drive.google.com/file/d/118-FteX6ILpSMIGBMFRyLdifNH3D47ww/view?usp=sharing'),
  ('meta', '2026-05-07'::date, '27118962711126386-26872039952485329', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-07T19-27 Transaction #27118962711126386-26872039952485329.pdf', 'https://drive.google.com/file/d/1R7yQEHzX09y5GxwvX6Zh-JEIkmepbGtY/view?usp=sharing'),
  ('meta', '2026-05-07'::date, '27199442533078402-27015507061471959', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-07T17-33 Transaction #27199442533078402-27015507061471959.pdf', 'https://drive.google.com/file/d/1b3e6Kgm2Iux72faYJamXX4zEfqXMAo5k/view?usp=sharing'),
  ('meta', '2026-05-07'::date, '26989676494055010-27008001628889167', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-07T16-23 Transaction #26989676494055010-27008001628889167.pdf', 'https://drive.google.com/file/d/13INpTvVZ02ULt95LDX1cravevOCQ8JHI/view?usp=sharing'),
  ('meta', '2026-05-07'::date, '26941213015568030-27013008388388493', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-07T12-55 Transaction #26941213015568030-27013008388388493.pdf', 'https://drive.google.com/file/d/17m79QuGqBKGMkcoAPrqfaR7M-VqqvgYV/view?usp=sharing'),
  ('meta', '2026-05-07'::date, '27127330326956293-26939296285759703', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-07T09-28 Transaction #27127330326956293-26939296285759703.pdf', 'https://drive.google.com/file/d/1WIZKvORoqjp6v-VnxnxPUoDHeKa8Cnzt/view?usp=sharing'),
  ('meta', '2026-05-07'::date, '26863318566690801-26982635938092399', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-07T03-21 Transaction #26863318566690801-26982635938092399.pdf', 'https://drive.google.com/file/d/1GOlN_f9xJMCHr_7lnKlhrhaRXWQLPVTO/view?usp=sharing'),
  ('meta', '2026-05-06'::date, '27124973513858643-26938445849178077', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-06T22-50 Transaction #27124973513858643-26938445849178077.pdf', 'https://drive.google.com/file/d/1McuZUeQxxIDX4trS_nMA_RmStPMiaXvT/view?usp=sharing'),
  ('meta', '2026-05-06'::date, '27106421592380498-27187951964227459', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-06T20-50 Transaction #27106421592380498-27187951964227459.pdf', 'https://drive.google.com/file/d/1G7F6Hir4Nsiqktx1i0ASvjYFggCmFrs3/view?usp=sharing'),
  ('meta', '2026-05-06'::date, '26931761019846563-27003555546000444', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-06T19-50 Transaction #26931761019846563-27003555546000444.pdf', 'https://drive.google.com/file/d/17mBfqiGS-wRAkPK0rsHqYNdHCA1qe3JX/view?usp=sharing'),
  ('meta', '2026-05-06'::date, '26977333381955988-26995610560128274', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-06T17-45 Transaction #26977333381955988-26995610560128274.pdf', 'https://drive.google.com/file/d/1pJXOWdncBZgktyR-ca_mR7hnX11xJwrG/view?usp=sharing'),
  ('meta', '2026-05-06'::date, '27120825530940108-27103405022682155', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-06T14-37 Transaction #27120825530940108-27103405022682155.pdf', 'https://drive.google.com/file/d/1MT62rYK0jnfAqePzjeUGR4WEibEnncm-/view?usp=sharing'),
  ('meta', '2026-05-06'::date, '26999573193065346-26932861596403169', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-06T11-47 Transaction #26999573193065346-26932861596403169.pdf', 'https://drive.google.com/file/d/1tO1T_KUI40uyGZECqU_hMnvjrr0h-P8P/view?usp=sharing'),
  ('meta', '2026-05-06'::date, '26997742273248438-26925953333760665', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-06T08-00 Transaction #26997742273248438-26925953333760665.pdf', 'https://drive.google.com/file/d/1evVPMu5KWTPRY38nA3DLCrFY7m7ivgeq/view?usp=sharing'),
  ('meta', '2026-05-06'::date, '26927604796928849-27096677590021565', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-06T01-38 Transaction #26927604796928849-27096677590021565.pdf', 'https://drive.google.com/file/d/1TOjl-fL1KyZ8dBDzLqjgOMANTUGaa--a/view?usp=sharing'),
  ('meta', '2026-05-05'::date, '26984810021208328-26919958907693441', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-05T21-08 Transaction #26984810021208328-26919958907693441.pdf', 'https://drive.google.com/file/d/1smBfPCiHAmf9Ef_TmFxom5hp5eHdaOSx/view?usp=sharing'),
  ('meta', '2026-05-05'::date, '27174557312233591-27174557372233585', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-05T19-00 Transaction #27174557312233591-27174557372233585.pdf', 'https://drive.google.com/file/d/11FpTSjTVPzK1nYhAn62dJXU4N2BHwMDn/view?usp=sharing'),
  ('meta', '2026-05-05'::date, '26918128301209835-26964750883214238', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-05T17-29 Transaction #26918128301209835-26964750883214238.pdf', 'https://drive.google.com/file/d/16Hv6uejH3iVNST3DBMe8I19jHTguAX0M/view?usp=sharing'),
  ('meta', '2026-05-05'::date, '27104882442534415-26981595061529824', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-05T14-34 Transaction #27104882442534415-26981595061529824.pdf', 'https://drive.google.com/file/d/1wcM8zzSMqCFUuwTHvj-33P_Hi9wlla2-/view?usp=sharing'),
  ('meta', '2026-05-05'::date, '26920653377623991-27171217919234197', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-05T12-06 Transaction #26920653377623991-27171217919234197.pdf', 'https://drive.google.com/file/d/1XbnvCPqpGz4UdHa9ei47N2YBoOyMefbr/view?usp=sharing'),
  ('meta', '2026-05-05'::date, '26985411951148137-27101770072845652', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-05T08-05 Transaction #26985411951148137-27101770072845652.pdf', 'https://drive.google.com/file/d/1kRbPjmunU-Px6Gth48HUBNqVjaiNZzKE/view?usp=sharing'),
  ('meta', '2026-05-05'::date, '26956136110742382-27097720086583984', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-05T00-14 Transaction #26956136110742382-27097720086583984.pdfg', 'https://drive.google.com/file/d/1x9J7bYZrzvg55NfK4KzwwnFerkYN7_1k/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '27096327436723249-27082180638137927', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T21-33 Transaction #27096327436723249-27082180638137927.pdf', 'https://drive.google.com/file/d/1jAHqsegzaCQvZ53xkKOho_L3uQfErx_8/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '27081503078205683-27098919993130662', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T20-09 Transaction #27081503078205683-27098919993130662.pdf', 'https://drive.google.com/file/d/1ERxQPBIiLKqZ-gyIAKDaNSUUMhyuyqVm/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '26906693295686669-26911833201839342', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T18-23 Transaction #26906693295686669-26911833201839342.pdf', 'https://drive.google.com/file/d/1ap0lKEJ5pKufBXg1nILh5zlVJgRSFua5/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '27094081413614518-26970772882612042', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T16-37 Transaction #27094081413614518-26970772882612042.pdf', 'https://drive.google.com/file/d/1uWPeUXI0jQ3_NgQB2D-Zb9V57Ki5Pvn4/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '26951344291221564-26969592036063460', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T14-04 Transaction #26951344291221564-26969592036063460.pdf', 'https://drive.google.com/file/d/1f_ECjNRvc6bLBTrBInMR0W4UMyy1W98p/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '26830692326620092-26975165675506098', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T11-17 Transaction #26830692326620092-26975165675506098.pdf', 'https://drive.google.com/file/d/1Pu9qfnFIoeAHIM_iCWdaN6pGoLtgd12V/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '26907412412281421-26967104699645527', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T08-27 Transaction #26907412412281421-26967104699645527.pdf', 'https://drive.google.com/file/d/1vbjhxSLQ0Idlx-9seXzltYOuqTtNvWtO/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '26947018054987521-27088575377498455', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T04-14 Transaction #26947018054987521-27088575377498455.pdf', 'https://drive.google.com/file/d/1iljEbGETeJRJ55Dd7NKsRjKJyKyDpa6S/view?usp=sharing'),
  ('meta', '2026-05-04'::date, '26825429310479727-27072094239146567', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-04T00-05 Transaction #26825429310479727-27072094239146567.pdf', 'https://drive.google.com/file/d/1rbfilaWuL8K4D_FgyUNpa8soP5BhB4Gu/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '27084821597873833-26901804489508880', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T21-07 Transaction #27084821597873833-26901804489508880.pdf', 'https://drive.google.com/file/d/1ZSfJvmnha2T27hSONukWHDI8W82TzyXb/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '26822843130738345-26960382676984396', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T18-51 Transaction #26822843130738345-26960382676984396.pdf', 'https://drive.google.com/file/d/1y82yjhXtG_2_BbYffxFFCJ8Jc_El8DGJ/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '27149672511388738-26966291166393549', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T16-39 Transaction #27149672511388738-26966291166393549.pdf', 'https://drive.google.com/file/d/1fjsXU23do1YjGquEyIAyfvuQ7TjFDoIN/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '26820744464281545-26898657196490276', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T14-07 Transaction #26820744464281545-26898657196490276.pdf', 'https://drive.google.com/file/d/1WxEs7VCWgpsfUGRb_Snx4KhIRlq6a8S4/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '26819676004388391-26956967707325893', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T11-39 Transaction #26819676004388391-26956967707325893.pdf', 'https://drive.google.com/file/d/16Pcs7_q2f4U3PSbgvOyAA5NWHcPmuW2M/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '26818737074482284-27079655771723749', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T09-25 Transaction #26818737074482284-27079655771723749.pdf', 'https://drive.google.com/file/d/11B74uV-XTqIhG9EtCiaJ2FO2kB3ktic5/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '27143626695326653-26888486150840717', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T02-52 Transaction #27143626695326653-26888486150840717.pdf', 'https://drive.google.com/file/d/1tE4-Qhwcr1vhw7_fE6KhuyetJevOrhEy/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '27060710576951600-27142249898797666', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T00-17 Transaction #27060710576951600-27142249898797666.pdf', 'https://drive.google.com/file/d/1REIdBZokV6O9TIekSRn2fszfDVYxr7qK/view?usp=sharing'),
  ('meta', '2026-05-03'::date, '27142158425473480-27078263135196348', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-03T00-07 Transaction #27142158425473480-27078263135196348.pdf', 'https://drive.google.com/file/d/1GA1z0SnavUm6VXRgdt52YW8HzXJWJNaH/view?usp=sharing'),
  ('meta', '2026-05-02'::date, '26958227780533221-27077764911912837', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-02T23-11 Transaction #26958227780533221-27077764911912837.pdf', 'https://drive.google.com/file/d/1O-K41Bisojjr3nW4sQNRjGiXg7lkArxX/view?usp=sharing'),
  ('meta', '2026-05-02'::date, '26884409391248393-26884409464581719', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-02T18-59 Transaction #26884409391248393-26884409464581719.pdf', 'https://drive.google.com/file/d/1Y0VIsoHZliiE6YZ89n3UXaocGxEWUHQm/view?usp=sharing'),
  ('meta', '2026-05-02'::date, '26888196564203006-27071244205898239', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-02T15-49 Transaction #26888196564203006-27071244205898239.pdf', 'https://drive.google.com/file/d/1FbqYLcIyogguesxRufTi7FWgi0qczrcd/view?usp=sharing'),
  ('meta', '2026-05-02'::date, '26808320228857302-26952673834421949', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-02T11-37 Transaction #26808320228857302-26952673834421949.pdf', 'https://drive.google.com/file/d/1l7rDAgYLwAqVP16YpnYgfs0O9ex4kFwa/view?usp=sharing'),
  ('meta', '2026-05-02'::date, '26925874740435186-27052681851087806', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-02T07-43 Transaction #26925874740435186-27052681851087806.pdf', 'https://drive.google.com/file/d/1_oQnGvunBPpUIPkuJXD5q9lud4R1ubUx/view?usp=sharing'),
  ('meta', '2026-05-02'::date, '26805033859185939-27132795893076400', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-02T04-32 Transaction #26805033859185939-27132795893076400.pdf', 'https://drive.google.com/file/d/1wsEwFV1X7KnvNNW6ESrAaEjPZ-Ga65ax/view?usp=sharing'),
  ('meta', '2026-05-02'::date, '27065842493105077-26942201775469153', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-02T04-22 Transaction #27065842493105077-26942201775469153.pdf', 'https://drive.google.com/file/d/1pgQkjG2d1pBgemekyTeiXGbUFtH8BWYb/view?usp=sharing'),
  ('meta', '2026-05-02'::date, '26921828377506489-27048601018162556', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-02T00-07 Transaction #26921828377506489-27048601018162556.pdf', 'https://drive.google.com/file/d/1X8FckX0NKogR42VAWu_vREBfDO5m3Ez9/view?usp=sharing'),
  ('meta', '2026-05-01'::date, '26878548788501117-26878548851834444', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-01T20-59 Transaction #26878548788501117-26878548851834444.pdf', 'https://drive.google.com/file/d/1RzVxvIQDKPuSfLgV0SPIg8lgCTadR1aa/view?usp=sharing'),
  ('meta', '2026-05-01'::date, '26918916661130994-26872142449141754', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-01T18-51 Transaction #26918916661130994-26872142449141754.pdf', 'https://drive.google.com/file/d/15OK4nH20UZiDucp64zlMV-ZIzdn06zfn/view?usp=sharing'),
  ('meta', '2026-05-01'::date, '26870989682590364-26917715457917781', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-01T16-29 Transaction #26870989682590364-26917715457917781.pdf', 'https://drive.google.com/file/d/1eHLjPB9pe8B8KeaaR1Xus-hbrC6YGu-3/view?usp=sharing'),
  ('meta', '2026-05-01'::date, '27042714085417916-26874503562238973', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-01T12-57 Transaction #27042714085417916-26874503562238973.pdf', 'https://drive.google.com/file/d/1dTwuUGt25P_AAqtEaTDyonofhHMtyWiy/view?usp=sharing'),
  ('meta', '2026-05-01'::date, '27058354817187180-27055405327482127', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-01T08-38 Transaction #27058354817187180-27055405327482127.pdf', 'https://drive.google.com/file/d/1F_YvLFH0oA_Pk9HyCl3TY7-Ti66mS5Ei/view?usp=sharing'),
  ('meta', '2026-05-01'::date, '27119020254453964-26791321823890476', 'American Express **** 1005', 22.00::numeric(12,2), '2026-05-01T02-13 Transaction #27119020254453964-26791321823890476.pdf', 'https://drive.google.com/file/d/1X1yUVcgqV5iMdw9NJtDaDMpzw4Yl-ed1/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '26866937712995558-26866937759662220', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T22-49 Transaction #26866937712995558-26866937759662220.pdf', 'https://drive.google.com/file/d/1EbuH63gXjh3CLt5vVAkCB00JBvNou2TI/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '26925198150502849-27048817144807612', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T20-28 Transaction #26925198150502849-27048817144807612.pdf', 'https://drive.google.com/file/d/1cKiln075VJk4cxnsw24t_eTMv-1jy217/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '26923574983998499-27047196578303002', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T17-25 Transaction #26923574983998499-27047196578303002.pdf', 'https://drive.google.com/file/d/1phoN3WhDvOveF1Eu4TmH6sWamvcp5isP/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '26862432963446033-26929114726777860', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T14-17 Transaction #26862432963446033-26929114726777860.pdf', 'https://drive.google.com/file/d/1DNlc9eDBP_blAdRudErCUOllf1yaz3TG/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '26920653867623944-27044267735262553', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T11-35 Transaction #26920653867623944-27044267735262553.pdf', 'https://drive.google.com/file/d/1N-gVdj9pQuGGXWBlDwcYhaU3Cr1AzgnI/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '26859299213759408-26781687441520581', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T07-29 Transaction #26859299213759408-26781687441520581.pdf', 'https://drive.google.com/file/d/1YsVVRjqNwBgukWivX5l4gCzrniBes_pE/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '26777902071899118-26850377181318281', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T00-38 Transaction #26777902071899118-26850377181318281.pdf', 'https://drive.google.com/file/d/1pbjMoDekvKTRfXhr0fF914H00ENbvsEj/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '27023737397315585-27041364998886162', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T00-20 Transaction #27023737397315585-27041364998886162.pdf', 'https://drive.google.com/file/d/102NmmijbKU98cbDqWdu5ckE_2Vo8lU7e/view?usp=sharing'),
  ('meta', '2026-04-30'::date, '26777585261930799-26921889214167078', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-30T00-06 Transaction #26777585261930799-26921889214167078.pdf', 'https://drive.google.com/file/d/1vAjHiWYadtFBeOSm2-4PKRVxDAhz8ozk/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '27036657022690291-26853480881007908', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T20-58 Transaction #27036657022690291-26853480881007908.pdf', 'https://drive.google.com/file/d/1HIIMdoK0nai2vqfMQcYm2RybGL8NI5p0/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '27038018599220802-26852101884479141', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T18-24 Transaction #27038018599220802-26852101884479141.pdf', 'https://drive.google.com/file/d/1rkiaHRv1b6opSdSHSkt6yBR2h1fHyGqA/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '27036507176038611-26772901372399188', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T15-28 Transaction #27036507176038611-26772901372399188.pdf', 'https://drive.google.com/file/d/15A4L-z6UPpHOSzzi1GZHJUfRncjny-pv/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '26890043304018330-26908091882213476', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T11-32 Transaction #26890043304018330-26908091882213476.pdf', 'https://drive.google.com/file/d/18_oznJUUyeUimoS_sLxQceZTZ3R0nY23/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '26841645508858115-26913460348343298', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T08-12 Transaction #26841645508858115-26913460348343298.pdf', 'https://drive.google.com/file/d/1_z5RwDKlWvTKNoxW-YaELjSINyeL0dl8/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '26766329086389750-27012310091791649', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T03-05 Transaction #26766329086389750-27012310091791649.pdf', 'https://drive.google.com/file/d/1nQ7tHw3TPoQqEBWzVSeTIvfIBTDlf54Y/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '27011548705201121-26909904425365557', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T01-54 Transaction #27011548705201121-26909904425365557.pdf', 'https://drive.google.com/file/d/1Uo0qHOb6kqnv72wC2mZlRkNWgd1x7K33/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '27026294727059854-27029025726786756', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T01-41 Transaction #27026294727059854-27029025726786756.pdf', 'https://drive.google.com/file/d/1Xc_j96rAGCxqJ1bPqx84pTPHYHbburXw/view?usp=sharing'),
  ('meta', '2026-04-29'::date, '27010467298642595-27010467358642589', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-29T00-08 Transaction #27010467298642595-27010467358642589.pdf', 'https://drive.google.com/file/d/1Bor0Hww-0euUb6uVqrfnYtx8WYaiBBgK/view?usp=sharing'),
  ('meta', '2026-04-28'::date, '26900117353010929-26907161792306487', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-28T21-26 Transaction #26900117353010929-26907161792306487.pdf', 'https://drive.google.com/file/d/1sassaT6m-0IkCMmqyq-tOrYJS3HlKyks/view?usp=sharing'),
  ('meta', '2026-04-28'::date, '27007182312304427-27007182358971089', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-28T18-29 Transaction #27007182312304427-27007182358971089.pdf', 'https://drive.google.com/file/d/1sABPBzx_w-gAifyLLZVfm0R-f5VvRy65/view?usp=sharing'),
  ('meta', '2026-04-28'::date, '27023365124019483-27005804219108903', 'American Express **** 1005', 22.00::numeric(12,2), '2026-04-28T15-50 Transaction #27023365124019483-27005804219108903.pdf', 'https://drive.google.com/file/d/1-qRpI-s9czNzKE3rOMBLX78IURBrARon/view?usp=sharing'),
  ('meta', '2026-04-28'::date, '26895045833518081-27003755672647091', 'American Express **** 1005', 20.90::numeric(12,2), '2026-04-28T12-05 Transaction #26895045833518081-27003755672647091.pdf', 'https://drive.google.com/file/d/1fo5HhgQJLlbw5ZWul7aSeIXW8bANChG0/view?usp=sharing'),
  ('meta', '2026-04-28'::date, '26754750860880906-26898897299799603', 'American Express **** 1005', 20.90::numeric(12,2), '2026-04-28T06-09 Transaction #26754750860880906-26898897299799603.pdf', 'https://drive.google.com/file/d/1ZcTmH_M8ebArDstq26kLklQc3OJXZPAa/view?usp=sharing'),
  ('meta', '2026-04-27'::date, '26823719183984078-27073149665707690', 'American Express **** 1005', 20.90::numeric(12,2), '2026-04-27T15-47 Transaction #26823719183984078-27073149665707690.pdf', 'https://drive.google.com/file/d/13Brkr67vYJEFcav4VYaimZ6wwnqDXW4b/view?usp=sharing'),
  ('meta', '2026-04-27'::date, '26990051764017482-27005114679177859', 'American Express **** 1005', 20.90::numeric(12,2), '2026-04-27T12-25 Transaction #26990051764017482-27005114679177859.pdf', 'https://drive.google.com/file/d/1SP26EPsp_NbPIvjp4a4_wA0sOg8qubGq/view?usp=sharing'),
  ('meta', '2026-04-27'::date, '26814937641528902-27069666386056018', 'American Express **** 1005', 20.90::numeric(12,2), '2026-04-27T08-50 Transaction #26814937641528902-27069666386056018.pdf', 'https://drive.google.com/file/d/15XjsR52kIrG3yV07Pyck7X8_Ew8iRRik/view?usp=sharing'),
  ('meta', '2026-04-26'::date, '26998392139850113-26815183548170975', 'American Express **** 1005', 17.01::numeric(12,2), '2026-04-26T23-35 Transaction #26998392139850113-26815183548170975.pdf', 'https://drive.google.com/file/d/1LyyIAygE8bXFB4vfpRIkAL3cmYSFnJS9/view?usp=sharing'),
  ('meta', '2026-04-26'::date, '26805351905820809-26993659253656735', 'MasterCard **** 5883', 20.90::numeric(12,2), '2026-04-26T15-04 Transaction #26805351905820809-26993659253656735.pdf', 'https://drive.google.com/file/d/1B4zfcY2TUWdogsMTBKUF1A7YSp_bSvED/view?usp=sharing'),
  ('meta', '2026-04-26'::date, '26803689625987037-26808980965457900', 'MasterCard **** 5883', 19.80::numeric(12,2), '2026-04-26T11-42 Transaction #26803689625987037-26808980965457900.pdf', 'https://drive.google.com/file/d/1_-rWJxZYgCOxvELbSWg_mXHlJnjeYQvb/view?usp=sharing'),
  ('meta', '2026-04-26'::date, '26729883826700943-27056788340677156', 'MasterCard **** 5883', 18.70::numeric(12,2), '2026-04-26T08-22 Transaction #26729883826700943-27056788340677156.pdf', 'https://drive.google.com/file/d/11ORLJOnlsyKZ3PBmPqSp-Tb8ugImRyAJ/view?usp=sharing'),
  ('meta', '2026-04-26'::date, '27053785087644148-26870838869272113', 'American Express **** 1005', 17.60::numeric(12,2), '2026-04-26T02-40 Transaction #27053785087644148-26870838869272113.pdf', 'https://drive.google.com/file/d/16yKiUt5ZEMbzWdNobziI3YuklZnbHUxr/view?usp=sharing'),
  ('meta', '2026-04-25'::date, '26719299197759406-26863231583366175', 'MasterCard **** 5883', 16.50::numeric(12,2), '2026-04-25T13-24 Transaction #26719299197759406-26863231583366175.pdf', 'https://drive.google.com/file/d/1TmZ33E9k0CBZ2ShU-GXdZAIin7JHp-PP/view?usp=sharing'),
  ('meta', '2026-04-25'::date, '26981152178240778-26978742348481759', 'MasterCard **** 5883', 15.40::numeric(12,2), '2026-04-25T11-24 Transaction #26981152178240778-26978742348481759.pdf', 'https://drive.google.com/file/d/1Eh85ijrx5_VMS9jg8FUhgfpsqnf4P8Cq/view?usp=sharing'),
  ('meta', '2026-04-25'::date, '26794762403546423-26794762486879748', 'American Express **** 1005', 14.30::numeric(12,2), '2026-04-25T09-47 Transaction #26794762403546423-26794762486879748.pdf', 'https://drive.google.com/file/d/1jrX_UcNkHCFFB3xHP9E0b1zPfxMEihxn/view?usp=sharing'),
  ('meta', '2026-04-25'::date, '26977170775305583-27043420042013986', 'American Express **** 1005', 13.20::numeric(12,2), '2026-04-25T08-28 Transaction #26977170775305583-27043420042013986.pdf', 'https://drive.google.com/file/d/1XtQV0OPjJ0uCp8XOYR3xCy9dlDRg-4Q9/view?usp=sharing'),
  ('meta', '2026-04-25'::date, '26976871262002203-26713895041633155', 'MasterCard **** 5883', 12.10::numeric(12,2), '2026-04-25T03-44 Transaction #26976871262002203-26713895041633155.pdf', 'https://drive.google.com/file/d/1YXdFj4Afb0ouzOXTFWlDjBzfaPoBF6Md/view?usp=sharing'),
  ('meta', '2026-04-24'::date, '26710198985336094-26847207814968550', 'MasterCard **** 5883', 11.00::numeric(12,2), '2026-04-24T22-00 Transaction #26710198985336094-26847207814968550.pdf', 'https://drive.google.com/file/d/1Nrt-mpitPJ-5FiOi3tmFliLs4IRvn21F/view?usp=sharing'),
  ('meta', '2026-04-24'::date, '26786373447718652-26708938128795513', 'MasterCard **** 5883', 9.90::numeric(12,2), '2026-04-24T19-56 Transaction #26786373447718652-26708938128795513.pdf', 'https://drive.google.com/file/d/1WmCRj1xumbYPBJ8KjJ6p9cyokDkJJwZx/view?usp=sharing'),
  ('meta', '2026-04-24'::date, '26780117741677559-26707945288894797', 'MasterCard **** 5883', 8.80::numeric(12,2), '2026-04-24T18-08 Transaction #26780117741677559-26707945288894797.pdf', 'https://drive.google.com/file/d/1pk6IlDr9iUD6v46VYendLwZOAcGwAwxD/view?usp=sharing'),
  ('meta', '2026-04-24'::date, '26784389264583737-26843975828625082', 'MasterCard **** 5883', 7.70::numeric(12,2), '2026-04-24T16-16 Transaction #26784389264583737-26843975828625082.pdf', 'https://drive.google.com/file/d/1mVNdcZ9GWnRlQXgWe2_0HWINm_UcJA0x/view?usp=sharing'),
  ('meta', '2026-04-24'::date, '26824279437261384-26842547068767958', 'MasterCard **** 5883', 6.60::numeric(12,2), '2026-04-24T13-41 Transaction #26824279437261384-26842547068767958.pdf', 'https://drive.google.com/file/d/1svFQJpmrUxWIlhex9YsU_i9PoEjQTKJy/view?usp=sharing'),
  ('meta', '2026-04-24'::date, '26703635335992459-26949081158114543', 'MasterCard **** 5883', 5.50::numeric(12,2), '2026-04-24T10-17 Transaction #26703635335992459-26949081158114543.pdf', 'https://drive.google.com/file/d/1Jr3fHYtXsZug6hgKZWW5-0b0Vm4TAZxF/view?usp=sharing'),
  ('meta', '2026-04-24'::date, '26774293868926613-26702189506137042', 'MasterCard **** 5883', 4.40::numeric(12,2), '2026-04-24T07-22 Transaction #26774293868926613-26702189506137042.pdf', 'https://drive.google.com/file/d/1IB7-a04wMNVK4zp4V1rT0-ZyWcA0PVuX/view?usp=sharing'),
  ('meta', '2026-04-24'::date, '26959318620424132-26961685090187487', 'MasterCard **** 5883', 3.30::numeric(12,2), '2026-04-24T01-33 Transaction #26959318620424132-26961685090187487.pdf', 'https://drive.google.com/file/d/1QaukVGEOa5BE2P_hpYFerWBOubekDCow/view?usp=sharing'),
  ('meta', '2026-04-21'::date, '26434002166285121-26419876214364375', 'American Express **** 1005', 995.70::numeric(12,2), '2026-04-21T20-39 Transaction #26434002166285121-26419876214364375.pdf', 'https://drive.google.com/file/d/10r29jPxu4eTZzq8YBVzYHLv8Q79LiyHJ/view?usp=sharing'),
  ('meta', '2026-04-10'::date, '26285533037798696-26319364344415564', 'American Express **** 1005', 1430.00::numeric(12,2), '2026-04-10T01-03 Transaction #26285533037798696-26319364344415564.pdf', 'https://drive.google.com/file/d/13mFJdy4uu0gl_Oy93hL3ain6rEJKxexT/view?usp=sharing'),
  ('meta', '2026-03-30'::date, '26072286765789996-26195581040127229', 'American Express **** 1005', 494.60::numeric(12,2), '2026-03-30T06-39 Transaction #26072286765789996-26195581040127229.pdf', 'https://drive.google.com/file/d/1ci8RaZCeFRLheOQrEuzNWRiFcKZGKKBx/view?usp=sharing'),
  ('meta', '2026-03-28'::date, '26124385487246783-26354148504270487', 'American Express **** 1005', 70.88::numeric(12,2), '2026-03-28T05-21 Transaction #26124385487246783-26354148504270487.pdf', 'https://drive.google.com/file/d/1d_iQYBKZ8X9BcvmKm2tcbOGUwkzzOWm_/view?usp=sharing'),
  ('meta', '2026-03-26'::date, '26029671046718235-26106605089024827', 'American Express **** 1005', 1424.50::numeric(12,2), '2026-03-26T14-32 Transaction #26029671046718235-26106605089024827.pdf', 'https://drive.google.com/file/d/12eF4MbFZAL5cexXqPEdfym1nvL4ckWuZ/view?usp=sharing'),
  ('meta', '2026-03-16'::date, '26038331662518839-26038331729185499', 'American Express **** 1005', 1394.80::numeric(12,2), '2026-03-16T13-23 Transaction #26038331662518839-26038331729185499.pdf', 'https://drive.google.com/file/d/124MjU790bZoGPpLpFyAQomYQCu1iAz7y/view?usp=sharing'),
  ('meta', '2026-02-28'::date, '25847300261621978-25833366013015400', 'American Express **** 1005', 374.24::numeric(12,2), '2026-02-28T06-24 Transaction #25847300261621978-25833366013015400.pdf', 'https://drive.google.com/file/d/1nTmBwTihciCyxgaYGHuRFHOjX2RQmW_B/view?usp=sharing'),
  ('meta', '2026-02-23'::date, '25831770309841643-25789395594079113', 'American Express **** 1005', 910.26::numeric(12,2), '2026-02-23T17-50 Transaction #25831770309841643-25789395594079113.pdf', 'https://drive.google.com/file/d/1IFKBFljkFAwQgPkHBUTlEc_GGyRtmGsq/view?usp=sharing'),
  ('meta', '2026-02-13'::date, '25716252274726784-25689023440782992', 'American Express **** 1005', 1375.00::numeric(12,2), '2026-02-13T12-34 Transaction #25716252274726784-25689023440782992.pdf', 'https://drive.google.com/file/d/1N7zYcvd07Qex47FEz1ToK1ienOCSNjyY/view?usp=sharing'),
  ('meta', '2026-01-29'::date, '25584661944552478-25540130582338950', 'American Express **** 1005', 7.25::numeric(12,2), '2026-01-29T06-14 Transaction #25584661944552478-25540130582338950.pdf', 'https://drive.google.com/file/d/1rXFSRTxCSTUGCe10Gl_rY80dZ1kQjycp/view?usp=sharing'),
  ('meta', '2026-01-28'::date, '25578802998471710-25768621492823191', 'American Express **** 1005', 2981.78::numeric(12,2), '2026-01-28T23-06 Transaction #25578802998471710-25768621492823191.pdf', 'https://drive.google.com/file/d/1VZRwnzT5ttvKMybipDlRuqFB7osGwIng/view?usp=sharing'),
  ('meta', '2026-01-06'::date, '25351255617893120-25559252950426714', 'American Express **** 1005', 901.24::numeric(12,2), '2026-01-06T10-50 Transaction #25351255617893120-25559252950426714.pdfg', 'https://drive.google.com/file/d/1vhbXaiEDa9vceXfmgecWzNyBn3f02cYE/view?usp=sharing'),
  ('meta', '2026-01-06'::date, '25328244596860884-25250036424681705', 'American Express **** 1005', 2406.04::numeric(12,2), '2026-01-06T10-39 Transaction #25328244596860884-25250036424681705.pdf', 'https://drive.google.com/file/d/1YIidS4-vSJlO_1lof2pdB7H_L6uvkaac/view?usp=sharing'),
  ('email', '2026-07-10'::date, 'Q2PEQ1NA-0006', 'American Express **** 1005', 77.00::numeric(12,2), 'Invoice-Q2PEQ1NA-0006.pdf', 'https://drive.google.com/file/d/1IpOQP0lvzDE6-IVPo2rVZmEs5z5RD_RF/view?usp=sharing'),
  ('email', '2026-06-10'::date, 'Q2PEQ1NA-0005', 'American Express **** 1005', 66.00::numeric(12,2), 'Invoice-Q2PEQ1NA-0005.pdf', 'https://drive.google.com/file/d/1yV_cOSsQ3xOwpmOj-4ZG8CJHkodxND77/view?usp=sharing'),
  ('email', '2026-05-10'::date, 'Q2PEQ1NA-0004', 'American Express **** 1005', 49.50::numeric(12,2), 'Invoice-Q2PEQ1NA-0004.pdf', 'https://drive.google.com/file/d/1qT8Acq3LeaS72h3fG7LRp3D4KzgkOINz/view?usp=sharing'),
  ('email', '2026-04-10'::date, 'Q2PEQ1NA-0003', 'American Express **** 1005', 49.50::numeric(12,2), 'Invoice-Q2PEQ1NA-0003.pdf', 'https://drive.google.com/file/d/16N6TjJ1B8J2SBl-10vvGFXyG8v_EGaZx/view?usp=sharing'),
  ('email', '2026-03-10'::date, 'Q2PEQ1NA-0002', 'American Express **** 1005', 33.00::numeric(12,2), 'Invoice-Q2PEQ1NA-0002.pdf', 'https://drive.google.com/file/d/1ozQKzLW1NYpXnLvjSxPRLLhBobL_WxXX/view?usp=sharing'),
  ('email', '2026-02-10'::date, 'Q2PEQ1NA-0001', 'American Express **** 1005', 33.00::numeric(12,2), 'Invoice-Q2PEQ1NA-0001.pdf', 'https://drive.google.com/file/d/13S0lFaaWHC4QnH4DmrTzvrLuf2UwTnCM/view?usp=sharing'),
  ('google', '2026-07-31'::date, '5646869595', 'American Express **** 1005', 4346.01::numeric(12,2), '07-31-26 Transaction #5646869595', 'https://drive.google.com/file/d/1m8HenjkcppnEqnQylvW-GhQ6EvKqxUFh/view?usp=sharing'),
  ('google', '2026-06-30'::date, '5622478273', 'American Express **** 1005', 4335.83::numeric(12,2), '06-30-26 Transaction #5622478273', 'https://drive.google.com/file/d/10IUX5C_L5NoiQJ0O_YgMy0fd3FvOL2-u/view?usp=sharing'),
  ('google', '2026-05-31'::date, '5590851855', 'American Express **** 1005', 3252.69::numeric(12,2), '05-31-26 Transaction #5590851855', 'https://drive.google.com/file/d/1nVIjmzOgrUEDvdgq1n5Aapr8moHGn4LS/view?usp=sharing'),
  ('google', '2026-04-30'::date, '5567424425', 'American Express **** 1005', 2656.30::numeric(12,2), '04-30-26 Transaction #5567424425', 'https://drive.google.com/file/d/1dvopB-UcelI922MiJ2wf1B8C0M8FmJt6/view?usp=sharing'),
  ('google', '2026-03-31'::date, '5543750125', 'American Express **** 1005', 2545.15::numeric(12,2), '03-31-26 Transaction #5543750125', 'https://drive.google.com/file/d/1Bw0tJtv9BA5lM73zAuDGo5jqRWA_c0Ln/view?usp=sharing'),
  ('google', '2026-02-28'::date, '5511632941', 'American Express **** 1005', 2121.22::numeric(12,2), '02-28-26 Transaction #5511632941', 'https://drive.google.com/file/d/1zUcjlOkogvf9XQ4B85Wn94Yncth1rDfY/view?usp=sharing'),
  ('google', '2026-01-31'::date, '5488655142', 'American Express **** 1005', 2195.75::numeric(12,2), '01-31-26 Transaction #5488655142', 'https://drive.google.com/file/d/1CI2U268HIvHCpOO6EaafJKTt5SvoHWJB/view?usp=sharing'),
  ('google', '2025-12-31'::date, '5459633147', 'American Express **** 1005', 460.83::numeric(12,2), '12-31-25 Transaction #5459633147', 'https://drive.google.com/file/d/13QoKQQS-zWZpzrNiQS9oIhbvZ2G3lIta/view?usp=sharing')
),
actor AS (
  SELECT id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1
),
platform_map AS (
  SELECT id, code
  FROM public.marketing_platforms
  WHERE code IN ('meta', 'google', 'email') AND deleted_at IS NULL
),
campaign_seed AS (
  INSERT INTO public.marketing_campaigns (
    platform_id, name, campaign_month, billing_cycle, cap_amount, currency, status, created_by
  )
  SELECT
    pm.id,
    CASE pm.code
      WHEN 'meta' THEN 'Meta Ads'
      WHEN 'google' THEN 'Google Ads'
      WHEN 'email' THEN 'Email Marketing'
      ELSE pm.code
    END || ' ' || to_char(date_trunc('month', re.entry_date), 'YYYY-MM') || ' default budget', 
    date_trunc('month', re.entry_date)::date,
    'monthly', 0, 'AUD', 'active', actor.id
  FROM raw_entries re
  JOIN platform_map pm ON pm.code = re.platform_code
  CROSS JOIN actor
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.marketing_campaigns mc
    WHERE mc.platform_id = pm.id
      AND mc.campaign_month = date_trunc('month', re.entry_date)::date
      AND mc.deleted_at IS NULL
  )
  GROUP BY pm.id, pm.code, date_trunc('month', re.entry_date), actor.id
  RETURNING id, platform_id, campaign_month
),
campaign_map AS (
  SELECT id, platform_id, campaign_month
  FROM campaign_seed
  UNION
  SELECT id, platform_id, campaign_month
  FROM public.marketing_campaigns
  WHERE deleted_at IS NULL
),
inserted_entries AS (
  INSERT INTO public.marketing_entries (
    campaign_id, platform_id, employee_id, submitted_by, entry_date, transaction_id, payment_method, amount, invoice_reference, invoice_file_name, currency, notes, created_by
  )
  SELECT
    cm.id,
    pm.id,
    NULL,
    actor.id,
    re.entry_date,
    re.transaction_id,
    re.payment_method,
    re.amount,
    re.invoice_reference,
    re.invoice_file_name,
    'AUD', 
    'Imported from ads data on 2026-08-17', 
    actor.id
  FROM raw_entries re
  JOIN platform_map pm ON pm.code = re.platform_code
  JOIN campaign_map cm ON cm.platform_id = pm.id AND cm.campaign_month = date_trunc('month', re.entry_date)::date
  CROSS JOIN actor
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.marketing_entries me
    WHERE me.platform_id = pm.id
      AND me.entry_date = re.entry_date
      AND coalesce(me.transaction_id, '') = coalesce(re.transaction_id, '')
      AND me.amount = re.amount
      AND coalesce(me.invoice_reference, '') = coalesce(re.invoice_reference, '')
      AND me.deleted_at IS NULL
  )
  RETURNING id
)
SELECT
  (SELECT count(*) FROM raw_entries) AS source_row_count,
  (SELECT count(*) FROM platform_map) AS platform_match_count,
  (
    SELECT count(*)
    FROM campaign_map cm
    JOIN platform_map pm ON pm.id = cm.platform_id
  ) AS campaign_match_count,
  (SELECT count(*) FROM inserted_entries) AS inserted_row_count;

COMMIT;

-- Preview query after migration:
-- SELECT mp.name AS platform, count(*) AS rows, round(sum(me.amount), 2) AS total_amount
-- FROM public.marketing_entries me
-- JOIN public.marketing_platforms mp ON mp.id = me.platform_id
-- WHERE me.deleted_at IS NULL
-- GROUP BY mp.name
-- ORDER BY mp.name;