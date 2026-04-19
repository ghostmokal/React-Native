import { Router } from "express";

const uploadRouter = Router();

uploadRouter.post("/upload-image", async (req, res) => {
  const { image, name } = req.body as { image?: string; name?: string };

  const apiKey = process.env["IMGBB_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "ImgBB API key not configured" });
    return;
  }

  if (!image) {
    res.status(400).json({ error: "No image provided" });
    return;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("image", image);
    if (name) formData.append("name", name);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const data = (await response.json()) as {
      success?: boolean;
      data?: { url?: string; display_url?: string };
      error?: { message?: string };
    };

    if (!response.ok || !data.success) {
      res
        .status(500)
        .json({ error: data?.error?.message ?? "ImgBB upload failed" });
      return;
    }

    res.json({ url: data.data?.display_url ?? data.data?.url });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

export default uploadRouter;
