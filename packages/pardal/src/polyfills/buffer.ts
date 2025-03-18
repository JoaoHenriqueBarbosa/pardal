/**
 * Simple Buffer polyfill for browser environments.
 * Implements only the functionality needed by the pardal library.
 */

export class PardalBuffer {
  private bytes: Uint8Array;

  /**
   * Creates a new Buffer from an ArrayBuffer, string, or array
   */
  constructor(input: ArrayBuffer | SharedArrayBuffer | string | number[] | Uint8Array) {
    if (input instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && input instanceof SharedArrayBuffer)) {
      this.bytes = new Uint8Array(input);
    } else if (typeof input === "string") {
      // For string input, create a UTF-8 encoded buffer
      this.bytes = new TextEncoder().encode(input);
    } else if (Array.isArray(input)) {
      // Convert array of numbers to Uint8Array
      this.bytes = new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      this.bytes = input;
    } else {
      throw new Error("Unsupported input type for PardalBuffer");
    }
  }

  /**
   * Convert buffer to string with optional encoding
   */
  toString(encoding?: string): string {
    if (!encoding || encoding === "utf8") {
      return new TextDecoder().decode(this.bytes);
    }
    if (encoding === "base64") {
      // Use browser's btoa function to convert to base64
      // First convert Uint8Array to binary string
      let binaryString = "";
      const len = this.bytes.length;
      for (let i = 0; i < len; i++) {
        binaryString += String.fromCharCode(this.bytes[i]);
      }
      return btoa(binaryString);
    }
    if (encoding === "hex") {
      // Convert to hex representation
      return Array.from(this.bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    throw new Error(`Unsupported encoding: ${encoding}`);
  }

  /**
   * Creates a Buffer from an ArrayBuffer
   */
  static from(input: ArrayBuffer | string | number[] | Uint8Array | ArrayBufferLike): ArrayBufferLike {
    // For ArrayBufferLike (including SharedArrayBuffer), create a copy to ensure we have a standard ArrayBuffer
    if (input instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && input instanceof SharedArrayBuffer)) {
      return input;
    }

    const buffer = new PardalBuffer(input);
    return buffer.buffer;
  }

  /**
   * Get the underlying ArrayBuffer
   */
  get buffer(): ArrayBufferLike {
    return this.bytes.buffer;
  }

  /**
   * For compatibility with existing code
   */
  get length(): number {
    return this.bytes.length;
  }
}

// Export the PardalBuffer as Buffer for drop-in replacement
export const Buffer = PardalBuffer;
