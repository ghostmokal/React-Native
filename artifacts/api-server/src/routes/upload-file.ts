import { Router } from "express";

const uploadFileRouter = Router();

uploadFileRouter.post("/upload-file", async (req, res) => {
  const { file, name, type } = req.body as {
    file?: string;
    name?: string;
    type?: string;
  };

  if (!file || !name) {
    res.status(400).json({ error: "No file or name provided" });
    return;
  }

  try {
    const buffer = Buffer.from(file, "base64");
    const blob = new Blob([buffer], { type: type ?? "application/octet-stream" });

    const formData = new FormData();
    formData.append("file", blob, name);
    formData.append("expires", "14d");

    const response = await fetch("https://file.io", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as {
      success?: boolean;
      link?: string;
      error?: string;
    };

    if (!response.ok || !data.success) {
      res.status(500).json({ error: data?.error ?? "File.io upload failed" });
      return;
    }

    res.json({ url: data.link });
  } catch (err) {
    res.status(500).json({ error: "File upload failed" });
  }
});

export default uploadFileRouter;
