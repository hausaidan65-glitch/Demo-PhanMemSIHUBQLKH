import { getModuleFieldConfig } from '../../../config/moduleFieldRegistry';

const fieldsFor = (targetType) =>
  (getModuleFieldConfig(targetType)?.importFields || []).map(({ key, label, required }) => ({
    value: key,
    label,
    ...(required ? { required: true } : {}),
  }));

export const COMMON_USER_FIELDS = fieldsFor('NETWORKING').filter(({ value }) =>
  ['timestamp', 'fullname', 'phone', 'email', 'organization', 'position', 'gender', 'age_group', 'participant_group'].includes(value),
);
export const TRAINING_FIELDS = fieldsFor('TRAINING').map((item) => {
  if (item.value === 'startup_stage') return { ...item, value: 'project_stage', label: 'Giai đoạn dự án' };
  if (item.value === 'program_selection_status') return { ...item, value: 'nq20_status', label: 'NQ20' };
  return item;
});
export const NETWORKING_FIELDS = fieldsFor('NETWORKING');
export const SEMINAR_FIELDS = fieldsFor('SEMINAR');
export const EXHIBITION_FIELDS = fieldsFor('EXHIBITION');
export const INCUBATION_FIELDS = fieldsFor('INCUBATION');

export function getFieldsForTarget(targetType) {
  const fields = fieldsFor(targetType);
  return fields.length ? fields : [...COMMON_USER_FIELDS];
}

export const SPECIAL_MAPPING_OPTIONS = [
  { value: '__EXTRA__', label: 'Giữ làm dữ liệu bổ sung' },
  { value: '__IGNORE__', label: 'Bỏ qua cột này' },
];
