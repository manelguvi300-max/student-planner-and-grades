"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/40 duration-200 sm:supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Móvil: la hoja se arrastra hacia abajo para cerrarla (desde cualquier punto, si su contenido está arriba del todo).
 * Mueve el elemento directo con `transform` (sin re-render) para que siga al dedo a 60 fps.
 */
function useSheetDrag(el: HTMLElement | null, close: () => void) {
  React.useEffect(() => {
    if (!el) return
    const mq = window.matchMedia("(max-width: 639px)")
    let startY = 0, dy = 0, t0 = 0, tracking = false, dragging = false

    // ¿el toque empezó dentro de algo que se desplaza (lista interna) y no está en su tope?
    const innerScrolled = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (n.scrollTop > 0) return true
      }
      return false
    }
    const onStart = (e: TouchEvent) => {
      if (!mq.matches || e.touches.length !== 1) return
      tracking = true; dragging = false; dy = 0
      startY = e.touches[0].clientY; t0 = Date.now()
      if (innerScrolled(e.target)) tracking = false
    }
    const onMove = (e: TouchEvent) => {
      if (!tracking) return
      const y = e.touches[0].clientY - startY
      if (!dragging) {
        if (el.scrollTop > 0 || y < -8) { tracking = false; return }
        if (y < 8) return
        dragging = true; startY = e.touches[0].clientY; t0 = Date.now()
        el.style.transition = "none"
        return
      }
      dy = Math.max(0, e.touches[0].clientY - startY)
      if (e.cancelable) e.preventDefault()
      el.style.transform = `translateY(${dy}px)`
    }
    const onEnd = () => {
      if (!tracking || !dragging) { tracking = false; return }
      tracking = false; dragging = false
      const v = dy / Math.max(1, Date.now() - t0)
      if (dy > 120 || (dy > 40 && v > 0.5)) {
        el.style.transition = "transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)"
        el.style.transform = "translateY(100%)"
        close()
      } else {
        el.style.transition = "transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)"
        el.style.transform = ""
        window.setTimeout(() => { el.style.transition = "" }, 300)
      }
    }
    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchmove", onMove, { passive: false })
    el.addEventListener("touchend", onEnd)
    el.addEventListener("touchcancel", onEnd)
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchmove", onMove)
      el.removeEventListener("touchend", onEnd)
      el.removeEventListener("touchcancel", onEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el])
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  // el Popup se monta dentro de un portal, después del primer render: por eso un ref con estado y no un useRef
  const [popupEl, setPopupEl] = React.useState<HTMLDivElement | null>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  useSheetDrag(popupEl, () => closeRef.current?.click())
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={setPopupEl}
        data-slot="dialog-content"
        className={cn(
          "fixed z-50 grid w-full grid-cols-[minmax(0,1fr)] gap-4 bg-popover p-4 text-sm text-popover-foreground ring-1 ring-border shadow-2xl shadow-black/30 outline-none duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 " +
            // móvil: hoja inferior que sube desde abajo
            "max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:duration-[260ms] max-sm:ease-[cubic-bezier(0.32,0.72,0,1)] max-sm:data-open:fade-in-100 max-sm:data-closed:fade-out-100 max-sm:rounded-t-2xl max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:data-open:slide-in-from-bottom-full max-sm:data-closed:slide-out-to-bottom-full " +
            // tablet / PC: diálogo centrado con zoom suave
            "sm:top-1/2 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        <div aria-hidden className="-mt-[9px] -mb-2 flex h-5 items-center justify-center sm:hidden">
          <span className="h-1 w-10 rounded-full bg-foreground/20" />
        </div>
        <DialogPrimitive.Close ref={closeRef} tabIndex={-1} aria-hidden className="hidden" />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2.5 right-2.5 rounded-md"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
