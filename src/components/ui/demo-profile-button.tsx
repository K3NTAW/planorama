import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

function DemoProfileButton() {
  return (
    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
      <img
        className="rounded-full"
        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=80&h=80&facepad=2"
        alt="Profile image"
        width={40}
        height={40}
        aria-hidden="true"
      />
    </Button>
  );
}

export { DemoProfileButton }; 