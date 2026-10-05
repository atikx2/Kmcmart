-- Apply the KmcBazar branding to the existing settings row.
UPDATE settings
SET site_name = 'KmcBazar',
    email = CASE WHEN email ILIKE '%@%' THEN 'support@kmcbazar.com' ELSE email END,
    logo_header = '/assets/logo-header.svg',
    logo_footer = '/assets/logo-footer.svg';
