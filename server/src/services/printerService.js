import net from 'net';
import Department from '../models/Department.js';

class EscPosBuilder {
  constructor() {
    this.buffer = [];
  }
  
  initialize() {
    this.buffer.push(0x1b, 0x40);
    return this;
  }
  
  alignCenter() {
    this.buffer.push(0x1b, 0x61, 0x01);
    return this;
  }
  
  alignLeft() {
    this.buffer.push(0x1b, 0x61, 0x00);
    return this;
  }
  
  alignRight() {
    this.buffer.push(0x1b, 0x61, 0x02);
    return this;
  }
  
  bold(on = true) {
    this.buffer.push(0x1b, 0x45, on ? 0x01 : 0x00);
    return this;
  }
  
  sizeNormal() {
    this.buffer.push(0x1d, 0x21, 0x00);
    return this;
  }
  
  sizeDouble() {
    this.buffer.push(0x1d, 0x21, 0x11);
    return this;
  }
  
  sizeTriple() {
    this.buffer.push(0x1d, 0x21, 0x22);
    return this;
  }
  
  text(str) {
    const bytes = Buffer.from(str, 'ascii');
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }
  
  line(str = '') {
    this.text(str + '\n');
    return this;
  }
  
  feed(lines = 1) {
    this.buffer.push(0x1b, 0x64, lines);
    return this;
  }
  
  cut() {
    this.buffer.push(0x1d, 0x56, 0x42, 0x00);
    return this;
  }
  
  toBuffer() {
    return Buffer.from(this.buffer);
  }
}

function padLine(left, right, width = 42) {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) return left + " " + right;
  return left + " ".repeat(spaceNeeded) + right;
}

async function sendRawToPrinter(host, port, buffer) {
  return new Promise((resolve, reject) => {
    if (!host) {
      console.log('🖨️ Printer IP not configured, skipping print.');
      return resolve(false);
    }
    const client = new net.Socket();
    client.setTimeout(3000);
    
    client.connect(port, host, () => {
      client.write(buffer, () => {
        client.destroy();
        resolve(true);
      });
    });
    
    client.on('error', (err) => {
      console.error(`🖨️ Printer TCP Error (${host}:${port}):`, err.message);
      client.destroy();
      resolve(false);
    });
    
    client.on('timeout', () => {
      console.error(`🖨️ Printer TCP Timeout (${host}:${port})`);
      client.destroy();
      resolve(false);
    });
  });
}

export async function testPrinter(settings) {
  const builder = new EscPosBuilder();
  builder.initialize()
    .alignCenter()
    .bold(true)
    .sizeDouble()
    .line("TEST PRINT")
    .sizeNormal()
    .bold(false)
    .feed(2)
    .line("ESC/POS Connection Successful!")
    .line(`Host: ${settings.printerHost}`)
    .line(`Port: ${settings.printerPort}`)
    .line(`Date: ${new Date().toLocaleString()}`)
    .feed(4)
    .cut();
  return sendRawToPrinter(settings.printerHost, settings.printerPort, builder.toBuffer());
}

export async function printCustomerReceipt(order, settings) {
  if (!settings.printerEnabled) return false;
  
  const builder = new EscPosBuilder();
  builder.initialize()
    .alignCenter()
    .bold(true)
    .sizeDouble()
    .line(settings.storeName || "SpiceUp")
    .sizeNormal()
    .bold(false)
    .line(settings.storeAddress || "")
    .line(`Tel: ${settings.storePhone || ""}`)
    .line("-".repeat(42))
    .alignLeft()
    .bold(true)
    .line(`ORDER: ${order.reference}`)
    .bold(false)
    .line(`Date: ${new Date(order.createdAt).toLocaleString()}`)
    .line(`Type: ${order.orderType.toUpperCase()} (${order.channel})`)
    .line("-".repeat(42));

  if (order.customer) {
    builder.line(`Customer: ${order.customer.name}`);
    builder.line(`Phone: ${order.customer.phone}`);
    if (order.customer.address && order.customer.address.line1) {
      builder.line(`Address: ${order.customer.address.line1}`);
      if (order.customer.address.postcode) {
        builder.line(`Postcode: ${order.customer.address.postcode}`);
      }
    }
    builder.line("-".repeat(42));
  }

  if (order.tableNumber) {
    builder.bold(true).line(`TABLE NUMBER: ${order.tableNumber}`).bold(false).line("-".repeat(42));
  }

  for (const line of order.lines) {
    if (line.isBundle) {
      builder.bold(true).line(padLine(`${line.quantity}x [DEAL] ${line.bundleSnapshot?.name || 'Bundle'}`, `£${(line.lineTotalPence / 100).toFixed(2)}`)).bold(false);
      for (const bi of line.bundleItems) {
        builder.line(`  - ${bi.menuItemSnapshot?.name}`);
        if (bi.variation) {
          builder.line(`    Size: ${bi.variation.name}`);
        }
        for (const m of bi.modifiers) {
          if (m.isManual && m.printOnReceipt === false) continue;
          const priceText = m.priceDeltaPence > 0 ? ` (+£${(m.priceDeltaPence / 100).toFixed(2)})` : '';
          builder.line(`    + ${m.optionName}${priceText}`);
        }
      }
    } else {
      const priceVal = `£${(line.lineTotalPence / 100).toFixed(2)}`;
      const itemLabel = `${line.quantity}x ${line.menuItemSnapshot?.name || 'Item'}`;
      builder.bold(true).line(padLine(itemLabel, priceVal)).bold(false);
      if (line.variation) {
        builder.line(`  Size: ${line.variation.name}`);
      }
      for (const m of line.modifiers) {
        if (m.isManual && m.printOnReceipt === false) continue;
        const priceText = m.priceDeltaPence > 0 ? ` (+£${(m.priceDeltaPence / 100).toFixed(2)})` : '';
        builder.line(`  + ${m.optionName}${priceText}`);
      }
      for (const ma of line.manualAddOns || []) {
        const priceText = ma.priceDeltaPence > 0 ? ` (+£${(ma.priceDeltaPence / 100).toFixed(2)})` : '';
        builder.line(`  + [Add-on] ${ma.name}${priceText}`);
      }
    }
    if (line.itemNote) {
      builder.line(`  *Note: ${line.itemNote}`);
    }
  }

  builder.line("-".repeat(42));

  builder.line(padLine("Subtotal:", `£${(order.subtotalPence / 100).toFixed(2)}`));
  if (order.discountPence > 0) {
    builder.line(padLine(`Discount (${order.discountReason || 'Promo'}):`, `-£${(order.discountPence / 100).toFixed(2)}`));
  }
  if (order.deliveryChargePence > 0) {
    builder.line(padLine("Delivery Charge:", `£${(order.deliveryChargePence / 100).toFixed(2)}`));
  }
  builder.bold(true).sizeDouble().line(padLine("TOTAL:", `£${(order.totalPence / 100).toFixed(2)}`, 21)).sizeNormal().bold(false);
  
  builder.line("-".repeat(42));
  
  const payMethod = order.payments?.[0]?.method || 'unpaid';
  const payStatus = order.payments?.[0]?.status || 'pending';
  builder.line(`Payment: ${payMethod.toUpperCase()} (${payStatus.toUpperCase()})`);
  builder.line("-".repeat(42));

  builder.bold(true).line("VAT BREAKDOWN").bold(false);
  builder.line(padLine("Rate", "Net      VAT      Gross", 42));
  const breakdown = order.vatBreakdown || {};
  for (const rate of Object.keys(breakdown)) {
    const b = breakdown[rate];
    const rStr = `${rate}%`;
    const netStr = `£${(b.netPence / 100).toFixed(2)}`;
    const vatStr = `£${(b.vatPence / 100).toFixed(2)}`;
    const grossStr = `£${(b.grossPence / 100).toFixed(2)}`;
    builder.line(padLine(rStr, `${netStr}  ${vatStr}  ${grossStr}`, 42));
  }
  builder.line("-".repeat(42));
  
  builder.alignCenter()
    .line(settings.receiptFooter || "Thank you for your custom!")
    .line("Powered by SpiceUp")
    .feed(4)
    .cut();

  return sendRawToPrinter(settings.printerHost, settings.printerPort, builder.toBuffer());
}

export async function printTokenReceipt(order, settings) {
  if (!settings.printerEnabled) return false;
  
  const builder = new EscPosBuilder();
  builder.initialize()
    .alignCenter()
    .bold(true)
    .sizeTriple()
    .line(`TOKEN: ${order.reference.slice(-4)}`)
    .sizeNormal()
    .bold(false)
    .line("-".repeat(42))
    .line(`ORDER REFERENCE: ${order.reference}`)
    .line(`Order Type: ${order.orderType.toUpperCase()}`)
    .line(`Time: ${order.estimatedReadyAt ? new Date(order.estimatedReadyAt).toLocaleTimeString() : 'ASAP'}`)
    .line("-".repeat(42))
    .feed(4)
    .cut();
    
  return sendRawToPrinter(settings.printerHost, settings.printerPort, builder.toBuffer());
}

export async function printKitchenTickets(order, settings, isAutoPrint = true) {
  if (!settings.printerEnabled) return false;
  
  // Load departments to get print settings (ticket heading, autoPrintEnabled, etc.)
  const departments = await Department.find({ tenant: order.tenant, isActive: true });
  
  const linesByDept = {};

  const addLineToDeptGroup = (deptId, deptName, itemData, quantity) => {
    const key = deptId ? deptId.toString() : 'OTHER';
    if (!linesByDept[key]) {
      linesByDept[key] = {
        deptId,
        deptName: deptName || 'Other',
        lines: []
      };
    }
    linesByDept[key].lines.push({ itemData, quantity });
  };

  for (const line of order.lines) {
    if (line.isBundle) {
      for (const bi of line.bundleItems) {
        addLineToDeptGroup(
          bi.menuItemSnapshot?.departmentId,
          bi.menuItemSnapshot?.departmentName,
          bi,
          line.quantity
        );
      }
    } else {
      addLineToDeptGroup(
        line.menuItemSnapshot?.departmentId,
        line.menuItemSnapshot?.departmentName,
        line,
        line.quantity
      );
    }
  }

  let allSuccess = true;

  for (const [deptKey, deptGroup] of Object.entries(linesByDept)) {
    const dept = departments.find(d => d._id.toString() === deptKey);
    
    // If it's an auto-print from order creation and auto-printing is disabled for this department, skip it.
    if (isAutoPrint && dept && dept.autoPrintEnabled === false) {
      console.log(`🖨️ Skipping auto-print for department ${dept.name} as autoPrintEnabled is false.`);
      continue;
    }

    const deptHeading = dept?.ticketHeading || dept?.name || deptGroup.deptName || 'Kitchen Ticket';
    
    const builder = new EscPosBuilder();
    builder.initialize()
      .alignCenter()
      .bold(true)
      .sizeDouble()
      .line(deptHeading.toUpperCase())
      .sizeNormal()
      .bold(false)
      .line("-".repeat(42))
      .alignLeft()
      .bold(true)
      .line(`ORDER #${order.reference.slice(-4)}  [${order.orderType.toUpperCase()}]`)
      .bold(false)
      .line(`Time: ${new Date(order.createdAt).toLocaleTimeString()}`)
      .line("-".repeat(42));

    for (const l of deptGroup.lines) {
      const qty = l.quantity;
      const snap = l.itemData.menuItemSnapshot;
      const variation = l.itemData.variation;
      const modifiers = l.itemData.modifiers || [];
      const note = l.itemData.itemNote;
      
      builder.bold(true).line(`${qty}x ${snap.name.toUpperCase()}`).bold(false);
      if (variation) {
        builder.line(`  Size: ${variation.name}`);
      }
      for (const m of modifiers) {
        if (m.isManual) {
          builder.line(`  -> + ${m.kitchenText || m.optionName}`);
        } else {
          const labelText = m.kitchenText || m.labelName;
          const prefix = labelText ? `${labelText.toUpperCase()} ` : '';
          const baseOptName = m.labelName ? m.optionName.replace(m.labelName + ' ', '') : m.optionName;
          builder.line(`  -> ${prefix}${baseOptName}`);
        }
      }
      for (const ma of l.itemData.manualAddOns || []) {
        builder.line(`  -> + [Add-on] ${ma.name}`);
      }
      if (note) {
        builder.bold(true).line(`  * NOTE: ${note}`).bold(false);
      }
    }
    
    builder.line("-".repeat(42))
      .feed(4)
      .cut();

    const success = await sendRawToPrinter(settings.printerHost, settings.printerPort, builder.toBuffer());
    if (!success) {
      allSuccess = false;
      console.error(`🖨️ Offline fallback: Failed to print kitchen ticket for department ${deptHeading}.`);
    }
  }

  return allSuccess;
}
