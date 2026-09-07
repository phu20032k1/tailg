-- Real site reports provided for 07/09/2026.
-- Run after supabase/migrations/20260907_daily_reporting_v3.sql.
-- Idempotent by (leader_id, report_date): rerunning replaces structured rows for that day.

select public.save_daily_report_v3(
  date '2026-09-07',
  '00000000-0000-0000-0000-000000000004',
  $msg$CÔNG TÁC BÁO CÁO ngày 07/9/2026
Đội: Trần Văn Toãn
1/ Nhân lực:
+ Kỹ thuật: 5; Lái máy:2; Bảo vệ: 2
+ Công nhật  5
+ Tổ thép :12
+ Tổ cốp pha  : 44
2/ Máy móc:
+ Máy xúc: 1
+ Máy ủi: 1
+ Máy lu: 0
3/ Kế hoạch công việc:
+ lắp dựng giáo khu vp + khu nhà xưởng
+ gia công lắp dựng thép ván khuôn cột khu nhà xưởng
+ san nền cát + base khu nền xưởng 01
+ lắp dựng copha đáy dầm sàn khu vp
4/ Các công việc khác
+ nghiệm thu copha cột+ đổ bê tông cột khu vp, san nền cát nhà xưởng, san sửa lót dầm móng nhà xưởng$msg$,
  null,
  jsonb_build_array(
    jsonb_build_object('category_code','technical','label','Kỹ thuật','headcount',5,'counts_as_worker',false,'sort_order',10),
    jsonb_build_object('category_code','machine_operator','label','Lái máy','headcount',2,'counts_as_worker',false,'sort_order',20),
    jsonb_build_object('category_code','security','label','Bảo vệ','headcount',2,'counts_as_worker',false,'sort_order',30),
    jsonb_build_object('category_code','day_labor','label','Công nhật','headcount',5,'counts_as_worker',true,'sort_order',40),
    jsonb_build_object('category_code','rebar','label','Tổ thép','headcount',12,'counts_as_worker',true,'sort_order',50),
    jsonb_build_object('category_code','formwork','label','Tổ cốp pha','headcount',44,'counts_as_worker',true,'sort_order',60)
  ),
  jsonb_build_array(
    jsonb_build_object('equipment_name','Máy xúc','quantity',1,'unit','máy','sort_order',10),
    jsonb_build_object('equipment_name','Máy ủi','quantity',1,'unit','máy','sort_order',20),
    jsonb_build_object('equipment_name','Máy lu','quantity',0,'unit','máy','sort_order',30)
  ),
  jsonb_build_array(
    jsonb_build_object('kind','main','area_label','Khu VP + nhà xưởng','description_vi','Lắp dựng giáo khu VP + khu nhà xưởng','sort_order',10),
    jsonb_build_object('kind','main','area_label','Nhà xưởng','description_vi','Gia công lắp dựng thép, ván khuôn cột khu nhà xưởng','sort_order',20),
    jsonb_build_object('kind','main','area_label','Xưởng 01','description_vi','San nền cát + base khu nền xưởng 01','sort_order',30),
    jsonb_build_object('kind','main','area_label','Khu VP','description_vi','Lắp dựng cốp pha đáy dầm sàn khu VP','sort_order',40),
    jsonb_build_object('kind','other','area_label','Khu VP','description_vi','Nghiệm thu cốp pha cột + đổ bê tông cột khu VP','sort_order',50),
    jsonb_build_object('kind','other','area_label','Nhà xưởng','description_vi','San nền cát nhà xưởng','sort_order',60),
    jsonb_build_object('kind','other','area_label','Nhà xưởng','description_vi','San sửa lót dầm móng nhà xưởng','sort_order',70)
  )
);

select public.save_daily_report_v3(
  date '2026-09-07',
  '00000000-0000-0000-0000-000000000002',
  $msg$CÔNG TÁC BÁO CÁO ngày 07/9/2026
Đội: Bùi Văn Đức
1/ Nhân lực:
+ Kỹ thuật: 6; Lái máy: 3; Bảo vệ: 2
+ Công nhật tổ Thái: 10
+ Tổ thép Quân: 5
+ Tổ thép Chính: 15
+ Tổ cốp pha Toản: 26
2/ Máy móc:
+ Máy lu:1; máy xúc: 2
3/ Nội dung công việc
+ Xưởng 1:
Lắp dựng ván khuôn dầm sàn trục X17-X19/Y7A-Y5
Gia công lắp dựng cốt thép dầm móng trục Y1/X1-X8; ô thang máy trục X2-X3/Y2-Y7
Tháo dỡ ván khuôn cột
+ Xưởng 2:
Gia công lắp dựng cốt thép, cốp pha đài móng trục X3-X7/Y2-Y6
Gia công lắp dựng cốt thép móng cẩu tháp
Tháo dỡ ván khuôn đài móng
4/ Công việc khác
+ Bơm nước, vệ sinh dầm đài, dọn vật tư...$msg$,
  null,
  jsonb_build_array(
    jsonb_build_object('category_code','technical','label','Kỹ thuật','headcount',6,'counts_as_worker',false,'sort_order',10),
    jsonb_build_object('category_code','machine_operator','label','Lái máy','headcount',3,'counts_as_worker',false,'sort_order',20),
    jsonb_build_object('category_code','security','label','Bảo vệ','headcount',2,'counts_as_worker',false,'sort_order',30),
    jsonb_build_object('category_code','day_labor','label','Công nhật','crew_name','Tổ Thái','headcount',10,'counts_as_worker',true,'sort_order',40),
    jsonb_build_object('category_code','rebar','label','Tổ thép','crew_name','Quân','headcount',5,'counts_as_worker',true,'sort_order',50),
    jsonb_build_object('category_code','rebar','label','Tổ thép','crew_name','Chính','headcount',15,'counts_as_worker',true,'sort_order',60),
    jsonb_build_object('category_code','formwork','label','Tổ cốp pha','crew_name','Toản','headcount',26,'counts_as_worker',true,'sort_order',70)
  ),
  jsonb_build_array(
    jsonb_build_object('equipment_name','Máy lu','quantity',1,'unit','máy','sort_order',10),
    jsonb_build_object('equipment_name','Máy xúc','quantity',2,'unit','máy','sort_order',20)
  ),
  jsonb_build_array(
    jsonb_build_object('kind','main','area_label','Xưởng 1','description_vi','Lắp dựng ván khuôn dầm sàn trục X17-X19/Y7A-Y5','sort_order',10),
    jsonb_build_object('kind','main','area_label','Xưởng 1','description_vi','Gia công lắp dựng cốt thép dầm móng trục Y1/X1-X8; ô thang máy trục X2-X3/Y2-Y7','sort_order',20),
    jsonb_build_object('kind','main','area_label','Xưởng 1','description_vi','Tháo dỡ ván khuôn cột','sort_order',30),
    jsonb_build_object('kind','main','area_label','Xưởng 2','description_vi','Gia công lắp dựng cốt thép, cốp pha đài móng trục X3-X7/Y2-Y6','sort_order',40),
    jsonb_build_object('kind','main','area_label','Xưởng 2','description_vi','Gia công lắp dựng cốt thép móng cẩu tháp','sort_order',50),
    jsonb_build_object('kind','main','area_label','Xưởng 2','description_vi','Tháo dỡ ván khuôn đài móng','sort_order',60),
    jsonb_build_object('kind','other','area_label',null,'description_vi','Bơm nước, vệ sinh dầm đài, dọn vật tư','sort_order',70)
  )
);

select public.save_daily_report_v3(
  date '2026-09-07',
  '00000000-0000-0000-0000-000000000003',
  $msg$CÔNG TÁC BÁO CÁO ngày 07/09/2026
Đội: Tăng Văn Toán
1/ Nhân lực:
+ Kỹ thuật: 5. Lái máy: 3; Bảo vệ: 3
+ Công nhật tổ Luân :10
+ Tổ thép Tịnh: 20
+ Tổ cốp pha Dũng : 44
2/ Máy móc : máy xúc: 01, Máy ủi: 01 Máy Lu :01
3/ Kế hoạch công việc
+ gia công cốt thép móng,dầm,cột,Dầm sàn
+ thi công cốt thép.ván khuôn cột tầng 1
+ Thi công lắp đặt cốt thép, ván khuôn Dầm sàn tầng 2 zone 1, cốt thép dầm móng
+ bắc giáo dầm sàn tầng 2 zone 2
4/ Các công việc khác
+ bơm nước, dọn vật tư$msg$,
  null,
  jsonb_build_array(
    jsonb_build_object('category_code','technical','label','Kỹ thuật','headcount',5,'counts_as_worker',false,'sort_order',10),
    jsonb_build_object('category_code','machine_operator','label','Lái máy','headcount',3,'counts_as_worker',false,'sort_order',20),
    jsonb_build_object('category_code','security','label','Bảo vệ','headcount',3,'counts_as_worker',false,'sort_order',30),
    jsonb_build_object('category_code','day_labor','label','Công nhật','crew_name','Tổ Luân','headcount',10,'counts_as_worker',true,'sort_order',40),
    jsonb_build_object('category_code','rebar','label','Tổ thép','crew_name','Tịnh','headcount',20,'counts_as_worker',true,'sort_order',50),
    jsonb_build_object('category_code','formwork','label','Tổ cốp pha','crew_name','Dũng','headcount',44,'counts_as_worker',true,'sort_order',60)
  ),
  jsonb_build_array(
    jsonb_build_object('equipment_name','Máy xúc','quantity',1,'unit','máy','sort_order',10),
    jsonb_build_object('equipment_name','Máy ủi','quantity',1,'unit','máy','sort_order',20),
    jsonb_build_object('equipment_name','Máy lu','quantity',1,'unit','máy','sort_order',30)
  ),
  jsonb_build_array(
    jsonb_build_object('kind','main','area_label','Xưởng 1','description_vi','Gia công cốt thép móng, dầm, cột, dầm sàn','sort_order',10),
    jsonb_build_object('kind','main','area_label','Tầng 1','description_vi','Thi công cốt thép, ván khuôn cột tầng 1','sort_order',20),
    jsonb_build_object('kind','main','area_label','Tầng 2 · Zone 1','description_vi','Thi công lắp đặt cốt thép, ván khuôn dầm sàn tầng 2 zone 1; cốt thép dầm móng','sort_order',30),
    jsonb_build_object('kind','main','area_label','Tầng 2 · Zone 2','description_vi','Bắc giáo dầm sàn tầng 2 zone 2','sort_order',40),
    jsonb_build_object('kind','other','area_label',null,'description_vi','Bơm nước, dọn vật tư','sort_order',50)
  )
);

select public.save_daily_report_v3(
  date '2026-09-07',
  '00000000-0000-0000-0000-000000000006',
  $msg$CÔNG TÁC BÁO CÁO ngày 7/9/2026
Đội: Nguyễn Ánh Quang
1/ Nhân lực:
+ Kỹ thuật: 6; Lái máy: 6; Bảo vệ: 2
+ Công nhật tổ Nhạ: 4
+ Công nhật tổ Tĩnh: 3
+ Ván khuôn tổ Thủy: 19
+ Cốt thép tổ Tiến: 8
2/ Máy móc:
+ Máy xúc: 2
+ Xe chuyển tải: 2
+ Cẩu lốp: 1
+ Máy ép cừ: 1
3/ Nội dung công việc
* Nhà ăn-nhà xe-bể ngầm
+ Gia công, lắp dựng ván khuôn dầm sàn tầng 2
+ Gia công cốt thép dầm sàn tầng 2
+ San, đầm base nền
+ Đào móng trục X9
+ Ép cừ bể ngầm
* Xưởng 3:
+ Đào móng
+ Gia công sắt thép đài, đầu cọc
+ Đào móng
4/ Các công việc khác
+ Sắp xếp, chuyển, hạ vật tư
+ Khơi nước, bơm nước xưởng 3
+ Hoàn thiện lán công nhân$msg$,
  null,
  jsonb_build_array(
    jsonb_build_object('category_code','technical','label','Kỹ thuật','headcount',6,'counts_as_worker',false,'sort_order',10),
    jsonb_build_object('category_code','machine_operator','label','Lái máy','headcount',6,'counts_as_worker',false,'sort_order',20),
    jsonb_build_object('category_code','security','label','Bảo vệ','headcount',2,'counts_as_worker',false,'sort_order',30),
    jsonb_build_object('category_code','day_labor','label','Công nhật','crew_name','Tổ Nhạ','headcount',4,'counts_as_worker',true,'sort_order',40),
    jsonb_build_object('category_code','day_labor','label','Công nhật','crew_name','Tổ Tĩnh','headcount',3,'counts_as_worker',true,'sort_order',50),
    jsonb_build_object('category_code','formwork','label','Ván khuôn','crew_name','Tổ Thủy','headcount',19,'counts_as_worker',true,'sort_order',60),
    jsonb_build_object('category_code','rebar','label','Cốt thép','crew_name','Tổ Tiến','headcount',8,'counts_as_worker',true,'sort_order',70)
  ),
  jsonb_build_array(
    jsonb_build_object('equipment_name','Máy xúc','quantity',2,'unit','máy','sort_order',10),
    jsonb_build_object('equipment_name','Xe chuyển tải','quantity',2,'unit','xe','sort_order',20),
    jsonb_build_object('equipment_name','Cẩu lốp','quantity',1,'unit','cẩu','sort_order',30),
    jsonb_build_object('equipment_name','Máy ép cừ','quantity',1,'unit','máy','sort_order',40)
  ),
  jsonb_build_array(
    jsonb_build_object('kind','main','area_label','Nhà ăn · Nhà xe · Bể ngầm','description_vi','Gia công, lắp dựng ván khuôn dầm sàn tầng 2','sort_order',10),
    jsonb_build_object('kind','main','area_label','Nhà ăn · Nhà xe · Bể ngầm','description_vi','Gia công cốt thép dầm sàn tầng 2','sort_order',20),
    jsonb_build_object('kind','main','area_label','Nhà ăn · Nhà xe · Bể ngầm','description_vi','San, đầm base nền','sort_order',30),
    jsonb_build_object('kind','main','area_label','Nhà ăn · Nhà xe · Bể ngầm','description_vi','Đào móng trục X9','sort_order',40),
    jsonb_build_object('kind','main','area_label','Bể ngầm','description_vi','Ép cừ bể ngầm','sort_order',50),
    jsonb_build_object('kind','main','area_label','Xưởng 3','description_vi','Đào móng','sort_order',60),
    jsonb_build_object('kind','main','area_label','Xưởng 3','description_vi','Gia công sắt thép đài, đầu cọc','sort_order',70),
    jsonb_build_object('kind','other','area_label',null,'description_vi','Sắp xếp, chuyển, hạ vật tư','sort_order',80),
    jsonb_build_object('kind','other','area_label','Xưởng 3','description_vi','Khơi nước, bơm nước xưởng 3','sort_order',90),
    jsonb_build_object('kind','other','area_label',null,'description_vi','Hoàn thiện lán công nhân','sort_order',100)
  )
);

select public.save_daily_report_v3(
  date '2026-09-07',
  '00000000-0000-0000-0000-000000000007',
  $msg$CÔNG TÁC BÁO CÁO ngày 7/9/2026
Đội: Nguyễn Duy Thọ
1/ Nhân lực:
+ Kỹ thuật: 4; TD: 2; Lái máy: 5; Bảo vệ: 2
+ Công nhật: 4 ng
+ Ván khuôn + cốt thép tổ anh Hải: 8 ng
2/ Máy móc:
+ Máy xúc: 2; ô tô: 3.
3/ Nội dung công việc
+ Gia công, lắp dựng cốt thép thành HG D800.
+ Gia công thép đế HG TNM D600.
+ Đào cống TNM D1200 (N2.19 ÷ N2.20).
+ Đào rãnh + bơm nước hố móng nhà X3.$msg$,
  null,
  jsonb_build_array(
    jsonb_build_object('category_code','technical','label','Kỹ thuật','headcount',4,'counts_as_worker',false,'sort_order',10),
    jsonb_build_object('category_code','survey','label','TD','headcount',2,'counts_as_worker',false,'sort_order',20),
    jsonb_build_object('category_code','machine_operator','label','Lái máy','headcount',5,'counts_as_worker',false,'sort_order',30),
    jsonb_build_object('category_code','security','label','Bảo vệ','headcount',2,'counts_as_worker',false,'sort_order',40),
    jsonb_build_object('category_code','day_labor','label','Công nhật','headcount',4,'counts_as_worker',true,'sort_order',50),
    jsonb_build_object('category_code','formwork','label','Ván khuôn + cốt thép','crew_name','Tổ anh Hải','headcount',8,'counts_as_worker',true,'sort_order',60)
  ),
  jsonb_build_array(
    jsonb_build_object('equipment_name','Máy xúc','quantity',2,'unit','máy','sort_order',10),
    jsonb_build_object('equipment_name','Ô tô','quantity',3,'unit','xe','sort_order',20)
  ),
  jsonb_build_array(
    jsonb_build_object('kind','main','area_label','Hạ tầng','description_vi','Gia công, lắp dựng cốt thép thành HG D800','sort_order',10),
    jsonb_build_object('kind','main','area_label','Hạ tầng','description_vi','Gia công thép đế HG TNM D600','sort_order',20),
    jsonb_build_object('kind','main','area_label','Hạ tầng','description_vi','Đào cống TNM D1200 (N2.19 ÷ N2.20)','sort_order',30),
    jsonb_build_object('kind','main','area_label','Xưởng 3','description_vi','Đào rãnh + bơm nước hố móng nhà X3','sort_order',40)
  )
);

select public.save_daily_report_v3(
  date '2026-09-07',
  '00000000-0000-0000-0000-000000000005',
  $msg$CÔNG TÁC BÁO CÁO ngày 7/9/2026
Đội: Nguyễn Văn Tuần
1/ Nhân lực:
+ Kỹ thuật: 4; Lái máy: 2; Bảo vệ: 2
+ Công nhật 8
+ Tổ thép: 25
+ Tổ cốp pha: 50
2/ Máy móc:
+ Máy xúc: 2
+ Máy ủi: 1
+ Máy lu: 1
3/ Kế hoạch công việc:
+ Lắp dựng cốt thép cốp pha cột trục X19-26/Y7-11
+ Lắp dựng giáo chống sàn tầng 2 trục X19-X25/Y7-Y11
+ nghiệm thu đổ bê tông đài dầm móng
+ san ủi nền base
4/ Các công việc khác
+ Bơm nước, vệ sinh lót đài, san cos lót, đổ râu cọc
+ San ủi lu nèn cát nền, đào móng, bắc giáo sàn$msg$,
  null,
  jsonb_build_array(
    jsonb_build_object('category_code','technical','label','Kỹ thuật','headcount',4,'counts_as_worker',false,'sort_order',10),
    jsonb_build_object('category_code','machine_operator','label','Lái máy','headcount',2,'counts_as_worker',false,'sort_order',20),
    jsonb_build_object('category_code','security','label','Bảo vệ','headcount',2,'counts_as_worker',false,'sort_order',30),
    jsonb_build_object('category_code','day_labor','label','Công nhật','headcount',8,'counts_as_worker',true,'sort_order',40),
    jsonb_build_object('category_code','rebar','label','Tổ thép','headcount',25,'counts_as_worker',true,'sort_order',50),
    jsonb_build_object('category_code','formwork','label','Tổ cốp pha','headcount',50,'counts_as_worker',true,'sort_order',60)
  ),
  jsonb_build_array(
    jsonb_build_object('equipment_name','Máy xúc','quantity',2,'unit','máy','sort_order',10),
    jsonb_build_object('equipment_name','Máy ủi','quantity',1,'unit','máy','sort_order',20),
    jsonb_build_object('equipment_name','Máy lu','quantity',1,'unit','máy','sort_order',30)
  ),
  jsonb_build_array(
    jsonb_build_object('kind','main','area_label','Xưởng 1','description_vi','Lắp dựng cốt thép, cốp pha cột trục X19-26/Y7-11','sort_order',10),
    jsonb_build_object('kind','main','area_label','Tầng 2','description_vi','Lắp dựng giáo chống sàn tầng 2 trục X19-X25/Y7-Y11','sort_order',20),
    jsonb_build_object('kind','main','area_label','Xưởng 1','description_vi','Nghiệm thu đổ bê tông đài, dầm móng','sort_order',30),
    jsonb_build_object('kind','main','area_label','Xưởng 1','description_vi','San ủi nền base','sort_order',40),
    jsonb_build_object('kind','other','area_label','Xưởng 1','description_vi','Bơm nước, vệ sinh lót đài, san cos lót, đổ râu cọc','sort_order',50),
    jsonb_build_object('kind','other','area_label','Xưởng 1','description_vi','San ủi, lu nèn cát nền, đào móng, bắc giáo sàn','sort_order',60)
  )
);

-- Quick verification: direct workers = 320, technical = 30 for 07/09/2026.
select
  report_date,
  sum(workers) as direct_workers,
  sum(technical_staff) as technical_staff,
  count(*) as teams_reported
from public.daily_reports
where report_date = date '2026-09-07'
group by report_date;
