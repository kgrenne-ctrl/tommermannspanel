// Lager app-ikonene (hjemskjerm) fra Bakøy-logoen. Kjøres for hånd ved behov:
//   swift scripts/lag-ikon.swift
// Merkeblått felt, hvit logo (aldri JPG) og stående kledning i hvitt og lyseblått.
// Logoen har selv den oransje streken, så ikonet har ingen egen.
// Alt innhold holdes innenfor de midterste 80 %, så ikonet kan beskjæres rundt (maskable).

import AppKit

let rot = URL(fileURLWithPath: CommandLine.arguments[0]).deletingLastPathComponent().deletingLastPathComponent()
let logoURL = rot.appendingPathComponent("assets/BAKOY_logo_hvit_transparent.png")
guard let logo = NSImage(contentsOf: logoURL) else { fatalError("Fant ikke logoen") }

func farge(_ hex: UInt32) -> NSColor {
  NSColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
          blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
}

func lagIkon(storrelse s: Int, fil: String) {
  let S = CGFloat(s)
  guard let bilde = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: s, pixelsHigh: s, bitsPerSample: 8,
                                     samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                     colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { return }
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bilde)

  // Bakgrunn: Bakøy merkeblå
  farge(0x074EA2).setFill()
  NSRect(x: 0, y: 0, width: S, height: S).fill()

  // Stående kledning: underbord (lyseblått) og påbord (hvitt) over, i nedre del
  let sone = S * 0.8, x0 = S * 0.1, bunn = S * 0.14, hoyde = S * 0.44
  let n = 5
  let u = sone / CGFloat(n)            // senteravstand
  let bu = u * 0.62, bo = u * 0.62
  let kant = max(1, S * 0.012)
  func bord(_ r: NSRect, _ fyll: NSColor) {
    fyll.setFill(); r.fill()
    farge(0x074EA2).setStroke()
    let sti = NSBezierPath(rect: r.insetBy(dx: kant / 2, dy: kant / 2)); sti.lineWidth = kant; sti.stroke()
  }
  for i in 0..<n { bord(NSRect(x: x0 + CGFloat(i) * u + (u - bu) / 2, y: bunn, width: bu, height: hoyde), farge(0xAFCBEC)) }
  for i in 0..<(n - 1) { bord(NSRect(x: x0 + CGFloat(i + 1) * u - bo / 2, y: bunn, width: bo, height: hoyde), .white) }

  // Logo øverst, 80 % bredde
  let lb = sone, lh = lb * logo.size.height / logo.size.width
  logo.draw(in: NSRect(x: x0, y: S * 0.86 - lh, width: lb, height: lh))

  NSGraphicsContext.restoreGraphicsState()
  let data = bilde.representation(using: .png, properties: [:])!
  try! data.write(to: rot.appendingPathComponent("assets/\(fil)"))
  print("Laget assets/\(fil)")
}

lagIkon(storrelse: 512, fil: "ikon-512.png")
lagIkon(storrelse: 192, fil: "ikon-192.png")
lagIkon(storrelse: 180, fil: "ikon-180.png")
