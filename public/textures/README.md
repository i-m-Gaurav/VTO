# Fabric Textures

Place your high-quality fabric texture images here.

## Recommended Format:
- **Size**: 512x512 or 1024x1024 pixels (square, seamless/tileable preferred)
- **Format**: JPG or PNG
- **Naming**: Use descriptive names like `denim.jpg`, `tweed.jpg`, `silk.jpg`

## Adding Predefined Textures:

1. Add your texture image to this folder (e.g., `denim.jpg`)
2. Update the `PREDEFINED_FABRICS` array in `src/stores/appStore.ts`:

```typescript
{
  id: 'denim',
  name: 'Denim',
  type: 'texture',
  textureUrl: '/textures/denim.jpg',
  thumbnailUrl: '/textures/denim.jpg',
  color: '#4a6fa5'  // Fallback color
}
```

## Texture Tips:
- Use seamless/tileable textures for best results
- Textures will be repeated 3x3 times on the garment by default
- Adjust the repeat value in `useTextureSwap.ts` if needed
