import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Maximize2 } from "lucide-react";
import { ReactNode } from "react";

interface FullscreenChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export const FullscreenChartDialog = ({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  children,
}: FullscreenChartDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0 bg-background border-border">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                {icon}
              </div>
            )}
            <div>
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="flex-1 p-6 overflow-hidden">
          <div className="w-full h-full">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ExpandChartButtonProps {
  onClick: () => void;
}

export const ExpandChartButton = ({ onClick }: ExpandChartButtonProps) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-lg hover:bg-muted/80 transition-colors"
      onClick={onClick}
      title="Expandir gráfico"
    >
      <Maximize2 className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
};
