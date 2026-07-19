import { useRef, useState } from "react"; 
import { QRCodeCanvas } from "qrcode.react"; 
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
} from "@/components/ui/dialog"; 
import { Button } from "@/components/ui/button"; 
import { Download, Copy, Share2 } from "lucide-react"; 
import { toast } from "sonner"; 
 
interface QRCodeModalProps { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  formUrl: string; 
  formName: string; 
} 
 
export const QRCodeModal = ({ 
  open, 
  onOpenChange, 
  formUrl, 
  formName, 
}: QRCodeModalProps) => { 
  const qrRef = useRef<HTMLDivElement>(null); 
 
  const downloadQR = () => { 
    const canvas = qrRef.current?.querySelector("canvas"); 
    if (!canvas) return; 
    const link = document.createElement("a"); 
    link.download = `qr-${formName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; 
    link.href = canvas.toDataURL("image/png"); 
    link.click(); 
    toast.success("QR code downloaded!"); 
  }; 
 
  const downloadWithBranding = () => { 
    const sourceCanvas = qrRef.current?.querySelector("canvas"); 
    if (!sourceCanvas) return; 
 
    const canvas = document.createElement("canvas"); 
    const size = 400; 
    canvas.width = size; 
    canvas.height = size + 90; 
    const ctx = canvas.getContext("2d"); 
    if (!ctx) return; 
 
    ctx.fillStyle = "#FFFFFF"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height); 
 
    ctx.fillStyle = "#7C3AED"; 
    ctx.fillRect(0, 0, canvas.width, 6); 
 
    const qrSize = size - 60; 
    ctx.drawImage(sourceCanvas, 30, 20, qrSize, qrSize); 
 
    ctx.fillStyle = "#7C3AED"; 
    ctx.font = "bold 20px sans-serif"; 
    ctx.textAlign = "center"; 
    ctx.fillText(formName, size / 2, size + 30); 
 
    ctx.fillStyle = "#666666"; 
    ctx.font = "14px sans-serif"; 
    ctx.fillText("Scan to share your experience", size / 2, size + 55); 
 
    ctx.fillStyle = "#7C3AED"; 
    ctx.font = "bold 12px sans-serif"; 
    ctx.fillText("Powered by KudoSpot", size / 2, size + 80); 
 
    const link = document.createElement("a"); 
    link.download = `qr-branded-${formName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; 
    link.href = canvas.toDataURL("image/png"); 
    link.click(); 
    toast.success("Branded QR downloaded!"); 
  }; 
 
  const copyLink = () => { 
    navigator.clipboard.writeText(formUrl); 
    toast.success("Link copied!"); 
  }; 
 
  const shareLink = async () => { 
    if (navigator.share) { 
      try { 
        await navigator.share({ 
          title: formName, 
          text: "Share your testimonial", 
          url: formUrl, 
        }); 
      } catch { 
        copyLink(); 
      } 
    } else { 
      copyLink(); 
    } 
  }; 
 
  return ( 
    <Dialog open={open} onOpenChange={onOpenChange}> 
      <DialogContent className="max-w-sm"> 
        <DialogHeader> 
          <DialogTitle>QR Code — {formName}</DialogTitle> 
          <DialogDescription>QR code for your testimonial collection form.</DialogDescription> 
        </DialogHeader> 
 
        <div className="flex flex-col items-center gap-4 py-2"> 
          <div 
            ref={qrRef} 
            className="rounded-2xl border-2 border-purple-100 p-4 bg-white shadow-sm" 
          > 
            <QRCodeCanvas 
              value={formUrl} 
              size={240} 
              fgColor="#7C3AED" 
              bgColor="#FFFFFF" 
              level="H" 
              includeMargin={true} 
            /> 
          </div> 
 
          <p className="text-xs text-center text-muted-foreground px-4 leading-relaxed"> 
            Print on receipts, visiting cards, or packaging. 
            Customers scan to submit a testimonial instantly. 
          </p> 
 
          <div className="w-full bg-muted rounded-lg px-3 py-2 
          text-xs font-mono text-muted-foreground truncate text-center"> 
            {formUrl} 
          </div> 
 
          <div className="grid grid-cols-2 gap-2 w-full"> 
            <Button variant="outline" size="sm" 
            onClick={downloadQR} className="w-full"> 
              <Download className="h-3.5 w-3.5 mr-1" /> 
              Download QR 
            </Button> 
            <Button variant="outline" size="sm" 
            onClick={downloadWithBranding} className="w-full"> 
              <Download className="h-3.5 w-3.5 mr-1" /> 
              With branding 
            </Button> 
          </div> 
 
          <div className="grid grid-cols-2 gap-2 w-full"> 
            <Button variant="outline" size="sm" 
            onClick={copyLink} className="w-full"> 
              <Copy className="h-3.5 w-3.5 mr-1" /> 
              Copy link 
            </Button> 
            <Button size="sm" onClick={shareLink} 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"> 
              <Share2 className="h-3.5 w-3.5 mr-1" /> 
              Share 
            </Button> 
          </div> 
        </div> 
      </DialogContent> 
    </Dialog> 
  ); 
}; 
