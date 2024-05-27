IMAGE_DIR="../public"

# Desired dimensions for the final images
FINAL_WIDTH=512
FINAL_HEIGHT=512

# Navigate to the directory containing the images
cd "$IMAGE_DIR"

# Check if the directory is not empty
if [ -z "$(ls -A $IMAGE_DIR)" ]; then
   echo "No files found in the directory."
   exit 1
fi

# Process each .webp file in the directory
for img in output_*.webp; do
    echo "Processing $img..."
    
    # Remove white background and trim excess margins
    convert "$img" -trim +repage "${img%.webp}_clean.webp"
    
    # Centerize the content and set the canvas to the desired dimensions
    convert "${img%.webp}_clean.webp" -background transparent -gravity center -extent ${FINAL_WIDTH}x${FINAL_HEIGHT} "${img%.webp}_final.webp"
    
    # Optional: Remove intermediate file
    rm "${img%.webp}_clean.webp"

    echo "$img processed and saved as ${img%.webp}_final.webp"
done

echo "All images have been processed."
