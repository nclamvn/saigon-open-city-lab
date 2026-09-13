# Completion Report — TIP-16-GEOMETRY

Trạng thái: **DONE — READY with deferred data**. Hoàn thành kiểm kê và sửa metadata, chưa hoàn thành mô hình khảo sát chính xác.

## Tệp

- Mới: TIP-16-GEOMETRY.md, SCAN-GEOMETRY.md, geometry-readiness.json, COMPLETION-GEOMETRY.md.
- Sửa có phạm vi: research/facades-15/selections.json, research/facades-15/manifest.json, data/facades-15.js — chỉ `mapping_basis` của Union Square và Continental sang Overture; bundle được ghi lại đồng bộ.
- Validator ghi lại research/facades-15/validation.json với kết quả PASS như trước.

## Requirement coverage và scenario results

7/7 AC hoàn thành (100% phạm vi audit, không phải % độ chính xác thành phố).

| AC | Kết quả | Chứng cứ |
|---|---|---|
| AC1 | PASS | 20 target join được; nguồn/giấy phép/hash qua validator |
| AC2 | PASS | 15 eligible, 5 held; quy tắc được tính lại |
| AC3 | PASS | City Hall cấu hình 26 m nhưng báo hiệu lực 9,6 m vì held |
| AC4 | PASS | Đếm lại 70.719 khối; ghi CRS hiển thị và nền phẳng |
| AC5 | PASS | 2 nguồn Overture sửa đồng bộ 3 tệp; validator vẫn PASS |
| AC6 | PASS | Chỉ 3 capture PoC15b, không dùng capture15a làm bằng chứng mới |
| AC7 | PASS | 20 hành động theo target và top5 ưu tiên trong SCAN |

## Technical health

Chạy `python3 outputs/hcmc-poc/scripts/validate_facades_15.py` trước/sau sửa metadata: exit 0, PASS. 20 hash ảnh, 20 metadata giấy phép, 20 quad hợp lệ, 20 neo footprint, bundle/atlas byte identity, hồi quy podium/VCB và A/B phục hồi đều qua. Không sửa ảnh, atlas, snapshot hoặc hình học. Không thêm runtime code nên không có build/type/lint mới; browser QA mới ngoài phạm vi nhánh audit, các capture hiện hành là bằng chứng đã lưu. Kiểm tra JSON kết quả hợp lệ, 20 entry, phân nhóm 14+1+5.

Deferred: 17 capture cùng phiên bản còn thiếu; hồ sơ đo kiểm cao độ/hình học, ảnh đồng kỳ, mặt khuất, độ sâu, nền địa hình và chuyên gia xác nhận hiện trạng. Chưa được phép diễn giải pipeline PASS thành chứng nhận hiện trạng chính xác.

## Decisions / deviations

Ban đầu audit read-only. Contractor đã duyệt bổ sung sửa đúng 2 metadata nguồn footprint sau khi chứng minh lineage Overture; không đổi phạm vi hình học. Chọn targeted correction thay regenerate atlas để giữ nguyên asset/hash và tránh phát sinh thay đổi không liên quan. Không commit/push. Không UAV.
