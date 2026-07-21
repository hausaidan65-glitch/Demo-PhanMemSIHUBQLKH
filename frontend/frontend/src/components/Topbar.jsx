import { Search, Bell } from "lucide-react";

export default function Topbar() {
  return (
    <header
      className="
h-20
bg-white
shadow
flex
items-center
justify-between
px-8
"
    >
      <div
        className="
flex
items-center
bg-gray-100
px-4
py-2
rounded-lg
w-96
"
      >
        <Search size={18} />

        <input
          placeholder="Search..."
          className="
bg-transparent
outline-none
ml-3
w-full
"
        />
      </div>

      <div
        className="
flex
items-center
gap-6
"
      >
        <Bell />

        <div
          className="
flex
items-center
gap-3
"
        >
          <div
            className="
w-10
h-10
rounded-full
bg-blue-600
text-white
flex
items-center
justify-center
"
          >
            A
          </div>

          <div>
            <p className="font-semibold">Admin</p>

            <p className="text-sm text-gray-500">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
