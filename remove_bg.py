import sys
from PIL import Image

def make_transparent(input_path, output_path):
    try:
        img = Image.open(input_path).convert("RGBA")
        data = img.getdata()
        
        new_data = []
        for item in data:
            # item is (R, G, B, A)
            r, g, b, a = item
            
            # Calculate saturation/colorfulness. 
            # If the difference between the max and min RGB values is small, it's grayscale.
            diff = max(r, g, b) - min(r, g, b)
            
            # The stars are bright yellow (high diff between R/G and B).
            # The checkerboard is gray/white (low diff).
            if diff < 30: 
                # It's a grayscale pixel (checkerboard), make it transparent
                new_data.append((r, g, b, 0))
            else:
                # It's colorful (part of the star), keep it!
                # To remove any grayish fringing, we can boost alpha based on diff, 
                # but standard keep is fine.
                new_data.append((r, g, b, 255))
                
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Successfully processed {input_path} -> {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    make_transparent("star-emoji-sticker-sparkle-noto-fonts-line-text-messaging-android-iphone-png-clipart.jpg", "icon.png")
