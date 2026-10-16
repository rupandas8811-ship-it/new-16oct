import re

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'r') as f:
    content = f.read()

props_replacement = """
interface EquipmentSelectorDropdownProps {
  equipment: Equipment[];
  selectedEquipmentNames: string[];
  otherStaffEquipments?: { staffName: string; equipmentNames: string[] }[];
  onToggleEquipment: (eqName: string) => void;
  onRemoveEquipment: (eqName: string) => void;
  checkEquipmentAvailability: (eqName: string, orderId?: string, date?: string, start?: string, end?: string) => any;
  currentOrderId?: string;
  targetEventDate?: string;
  targetStartTime?: string;
  targetEndTime?: string;
  targetStaffName?: string;
  disabled?: boolean;
  placeholder?: string;
}
"""

content = re.sub(
    r'interface EquipmentSelectorDropdownProps \{.*?\n\}',
    props_replacement.strip(),
    content,
    flags=re.DOTALL
)

func_replacement = """
export const EquipmentSelectorDropdown: React.FC<EquipmentSelectorDropdownProps> = ({
  equipment,
  selectedEquipmentNames,
  otherStaffEquipments = [],
  onToggleEquipment,
  onRemoveEquipment,
  checkEquipmentAvailability,
  currentOrderId,
  targetEventDate,
  targetStartTime,
  targetEndTime,
  targetStaffName,
  disabled = false,
  placeholder = "Select equipment..."
}) => {
"""

content = re.sub(
    r'export const EquipmentSelectorDropdown: React\.FC<EquipmentSelectorDropdownProps> = \(\{.*?\n\}\) => \{',
    func_replacement.strip(),
    content,
    flags=re.DOTALL
)

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'w') as f:
    f.write(content)

