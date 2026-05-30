import { useEffect, useRef, useState } from "react"; 
import QRCode from "qrcode"; 
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
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
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const [qrDataUrl, setQrDataUrl] = useState<string>(""); 
 
  useEffect(() => { 
    if (open && formUrl) { 
      generateQR(); 
    } 
  }, [open, formUrl]); 
 
  const generateQR = async () => { 
    try { 
      if (canvasRef.current) { 
        await QRCode.toCanvas(canvasRef.current, formUrl, { 
          width: 280, 
          margin: 2, 
          color: { 
            dark: "#7C3AED", 
            light: "#FFFFFF", 
          }, 
          errorCorrectionLevel: "H", 
        }); 
        const dataUrl = canvasRef.current.toDataURL("image/png"); 
        setQrDataUrl(dataUrl); 
      } 
    } catch (err) { 
      console.error("QR generation error:", err); 
    } 
  }; 
 
  const downloadQR = () => { 
    if (!qrDataUrl) return; 
    const link = document.createElement("a"); 
    link.download = `kudospot-qr-${formName 
      .toLowerCase() 
      .replace(/[^a-z0-9]+/g, "-")}.png`; 
    link.href = qrDataUrl; 
    link.click(); 
    toast.success("QR code downloaded!"); 
  }; 
 
  const downloadQRWithBranding = async () => { 
    const canvas = document.createElement("canvas"); 
    const size = 400; 
    canvas.width = size; 
    canvas.height = size + 80; 
    const ctx = canvas.getContext("2d"); 
    if (!ctx) return; 
 
    ctx.fillStyle = "#FFFFFF"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height); 
 
    ctx.fillStyle = "#7C3AED"; 
    ctx.fillRect(0, 0, canvas.width, 8); 
 
    if (canvasRef.current) { 
      const qrSize = size - 40; 
      ctx.drawImage(canvasRef.current, 20, 20, qrSize, qrSize); 
    } 
 
    ctx.fillStyle = "#7C3AED"; 
    ctx.font = "bold 18px sans-serif"; 
    ctx.textAlign = "center"; 
    ctx.fillText(formName, size / 2, size + 30); 
 
    ctx.fillStyle = "#888888"; 
    ctx.font = "13px sans-serif"; 
    ctx.fillText("Scan to share your experience", size / 2, size + 55); 
 
    ctx.fillStyle = "#7C3AED"; 
    ctx.font = "bold 11px sans-serif"; 
    ctx.fillText("Powered by KudoSpot", size / 2, size + 75); 
 
    const link = document.createElement("a"); 
    link.download = `kudospot-qr-branded-${formName 
      .toLowerCase() 
      .replace(/[^a-z0-9]+/g, "-")}.png`; 
    link.href = canvas.toDataURL("image/png"); 
    link.click(); 
    toast.success("Branded QR code downloaded!"); 
  }; 
 
  const copyLink = () => { 
    navigator.clipboard.writeText(formUrl); 
    toast.success("Form link copied!"); 
  }; 
 
  const shareQR = async () => { 
    if (navigator.share) { 
      try { 
        await navigator.share({ 
          title: `${formName} - Share your experience`, 
          text: "Scan this QR code to share your testimonial", 
          url: formUrl, 
        }); 
      } catch (err) { 
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
        </DialogHeader> 
 
        <div className="flex flex-col items-center gap-4 py-2"> 
          <div className="rounded-2xl border-2 border-purple-100 p-4 bg-white shadow-sm"> 
            <canvas ref={canvasRef} /> 
          </div> 
 
          <p className="text-xs text-center text-muted-foreground px-4 leading-relaxed"> 
            Print this QR code on receipts, visiting cards, or product  
            packaging. Customers scan it to submit a testimonial instantly. 
          </p> 
 
          <div className="w-full bg-muted rounded-lg px-3 py-2 text-xs  
          font-mono text-muted-foreground truncate text-center"> 
            {formUrl} 
          </div> 
 
          <div className="grid grid-cols-2 gap-2 w-full"> 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadQR} 
              className="w-full" 
            > 
              <Download className="h-3.5 w-3.5 mr-1" /> 
              Download QR 
            </Button> 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadQRWithBranding} 
              className="w-full" 
            > 
              <Download className="h-3.5 w-3.5 mr-1" /> 
              With branding 
            </Button> 
          </div> 
 
          <div className="grid grid-cols-2 gap-2 w-full"> 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyLink} 
              className="w-full" 
            > 
              <Copy className="h-3.5 w-3.5 mr-1" /> 
              Copy link 
            </Button> 
            <Button 
              size="sm" 
              onClick={shareQR} 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
            > 
              <Share2 className="h-3.5 w-3.5 mr-1" /> 
              Share 
            </Button> 
          </div> 
        </div> 
      </DialogContent> 
    </Dialog> 
  ); 
}; 
