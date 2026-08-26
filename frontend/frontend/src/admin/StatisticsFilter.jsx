import { useState } from "react";
function MultiSelect({ title, options = [], selected = [], setSelected }) {
  const [open, setOpen] = useState(false);

  const toggleItem = (item) => {
    const safeSelected = Array.isArray(selected) ? selected : [];

    if (safeSelected.includes(item)) {
      setSelected(safeSelected.filter((x) => x !== item));
    } else {
      setSelected([...safeSelected, item]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="
                border rounded-lg
                px-4 py-2
                bg-white
                min-w-[180px]
                text-left
                "
      >
        {title}
        {Array.isArray(selected) &&
          selected.length > 0 &&
          ` (${selected.length})`}
        ▼
      </button>

      {open && (
        <div
          className="
      absolute
      z-50
      mt-2
      w-[320px]
      max-w-[90vw]
      bg-white
      border
      rounded-xl
      shadow-xl
      max-h-80
      overflow-y-auto
      p-3
    "
        >
          {(Array.isArray(options) ? options : []).map((item, index) => (
            <label
              key={index}
              className="
flex
gap-2
items-start
py-1
cursor-pointer
"
            >
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={() => toggleItem(item)}
              />

              <span
                className="
 break-words
 leading-6
 "
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StatisticsFilter({
  courses,

  classes,

  ageGroups,

  projectFields,

  statuses,

  filters,

  setFilters,

  onApply,
  onReset,
}) {
  return (
    <div
      className="
flex
gap-4
flex-wrap
mb-6
"
    >
      <MultiSelect
        title="Độ tuổi"
        options={ageGroups}
        selected={filters.age_groups}
        setSelected={(value) =>
          setFilters({
            ...filters,
            age_groups: value,
          })
        }
      />
      <MultiSelect
        title="Lĩnh vực dự án"
        options={projectFields || []}
        selected={filters.project_fields}
        setSelected={(value) =>
          setFilters({
            ...filters,

            project_fields: value,
          })
        }
      />
      <MultiSelect
        title="Trạng thái"
        options={statuses || []}
        selected={filters.statuses}
        setSelected={(value) =>
          setFilters({
            ...filters,

            statuses: value,
          })
        }
      />
      <div>
        <label className="text-sm">Từ ngày</label>

        <input
          type="date"
          value={filters.date_from || ""}
          onChange={(e) =>
            setFilters({
              ...filters,

              date_from: e.target.value,
            })
          }
          className="
border
rounded-lg
px-3
py-2
"
        />
      </div>

      <div>
        <label className="text-sm">Đến ngày</label>

        <input
          type="date"
          value={filters.date_to || ""}
          onChange={(e) =>
            setFilters({
              ...filters,

              date_to: e.target.value,
            })
          }
          className="
border
rounded-lg
px-3
py-2
"
        />
      </div>
      <div
        className="
flex 
items-center 
gap-3
no-export
"
      >
        <button
          type="button"
          onClick={onApply}
          className="
        rounded-xl
        bg-green-600
        px-5
        py-2
        text-white
        hover:bg-green-700
    "
        >
          Áp dụng
        </button>

        <button
          type="button"
          onClick={() => {
            onReset?.();
          }}
          className="
rounded-xl
border
border-slate-300
bg-white
px-5
py-2
text-slate-700
hover:bg-slate-100
"
        >
          Đặt lại
        </button>
      </div>
    </div>
  );
}
