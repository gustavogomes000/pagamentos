import { Loader2 } from "lucide-react";

interface Props {
  message?: string;
}

export function LoadingScreen({ message = "Carregando..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 animate-fade-in">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20" />
        <Loader2 className="w-10 h-10 text-primary animate-spin absolute inset-0" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
