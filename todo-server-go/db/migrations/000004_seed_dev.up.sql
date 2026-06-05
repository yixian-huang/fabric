-- Dev seed data for fabrics/options (idempotent).

INSERT INTO options (option_id, category_code, option_code, option_name, sort_order)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'style', 'STYLE001', 'Matte', 1),
    ('00000000-0000-4000-8000-000000000002', 'style', 'STYLE002', 'Glossy', 2),
    ('00000000-0000-4000-8000-000000000003', 'style', 'STYLE003', 'Textured', 3),
    ('00000000-0000-4000-8000-000000000004', 'process', 'PROC001', 'Waterproof', 1),
    ('00000000-0000-4000-8000-000000000005', 'process', 'PROC002', 'Wrinkle-free', 2),
    ('00000000-0000-4000-8000-000000000006', 'process', 'PROC003', 'Anti-static', 3),
    ('00000000-0000-4000-8000-000000000007', 'process', 'PROC004', 'Brushed', 4)
ON CONFLICT (option_code) DO NOTHING;

INSERT INTO fabrics (
    fabric_id, code, reference_code, merchant_code, weight, weight_unit, fabric_type,
    style_codes, process_codes, remark, created_at
)
VALUES
    (
        '00000000-0000-4000-8000-000000000101',
        'FB1001', 'REF-1001', 'MC-A', 120, 'g/m2', '2',
        '["STYLE001","STYLE002"]'::jsonb, '["PROC001"]'::jsonb, 'lightweight',
        NOW() - INTERVAL '72 hours'
    ),
    (
        '00000000-0000-4000-8000-000000000102',
        'FB1002', 'REF-1002', 'MC-B', 210, 'g/m2', '1',
        '["STYLE002"]'::jsonb, '["PROC002","PROC003"]'::jsonb, 'soft handfeel',
        NOW() - INTERVAL '48 hours'
    ),
    (
        '00000000-0000-4000-8000-000000000103',
        'FB1003', 'REF-1003', 'MC-C', 300, 'g/m2', '2',
        '["STYLE003"]'::jsonb, '["PROC001","PROC004"]'::jsonb, 'heavy duty',
        NOW() - INTERVAL '24 hours'
    )
ON CONFLICT (code) DO NOTHING;

INSERT INTO fabric_components (component_id, fabric_id, name, percentage, option_code)
VALUES
    ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Cotton', 80, 'COMP001'),
    ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Polyester', 20, 'COMP002'),
    ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', 'Viscose', 60, 'COMP003'),
    ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000102', 'Nylon', 40, 'COMP004'),
    ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000103', 'Wool', 55, 'COMP005'),
    ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000103', 'Acrylic', 45, 'COMP006')
ON CONFLICT (component_id) DO NOTHING;
