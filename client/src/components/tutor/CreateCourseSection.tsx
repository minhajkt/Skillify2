import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  CircularProgress,
} from "@mui/material";
import { Upload as UploadIcon } from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { createCourse, fetchCategories } from "../../api/courseApi";
import { useSelector } from "react-redux";
// import { RootState } from "../../store/store";
import { useNavigate } from "react-router-dom";
import { User } from "../../types/User";
import Navbar from "../shared/Navbar";
import * as Yup from "yup";
import { Formik, Form, Field, FormikHelpers } from "formik";


interface AuthState {
  user: User | null;
}

interface RootState {
  auth: AuthState;
}


interface CreateCourseValues {
  title: string;
  description: string;
  category: string;
  price: string;
  thumbnail: File | null;
}

const CreateCourseSchema = Yup.object().shape({
  title: Yup.string().required("Course title is required"),
  description: Yup.string().required("Course description is required"),
  category: Yup.string()
    .notOneOf(["select"], "Please select a category")
    .required("Category is required"),
  price: Yup.number()
    .required("Course price is required")
    .positive("Price must be positive"),
  thumbnail: Yup.mixed()
    .required("Thumbnail is required")
    .test("fileSize", "File size is too large", (value) => {
      const file = value as File;
      return file ? file.size <= 5 * 1024 * 1024 : true; 
    })
    .test("fileType", "Invalid file type", (value) => {
      const file = value as File;
      return file
        ? ["image/png", "image/jpeg", "image/webp"].includes(file.type)
        : true; 
    }),
});


const CreateCourseSection = () => {

  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const tutor = useSelector((state: RootState) => state.auth.user);
  const tutorId = tutor?._id;
 const [searchQuery, setSearchQuery] = useState("");

 const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
   setSearchQuery(e.target.value);
 };

  useEffect(() => {
    const getCategories = async() => {
        const response = await fetchCategories()
        setCategories(response)
    }
    getCategories()
  }, [])

  const navigate = useNavigate();



  const handleCreateCourse = async (
    values: CreateCourseValues,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { setSubmitting, setErrors }: FormikHelpers<CreateCourseValues>
  ) => {
    setErrorMessage("");
    const { title, description, category, price, thumbnail } = values;
    if (!tutorId) {
      setErrorMessage("Tutor ID is missing. Please log in again.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("createdBy", tutorId);

    if (thumbnail) {
      formData.append("thumbnail", thumbnail);
    }

    try {
      setStatus("loading");
      const response = await createCourse(formData);
      // console.log("Course created successfully:", response);
      // console.log("responsedata:", response.newCourse);
      const courseId = response?.newCourse?._id;
      // console.log("Course id: ", courseId);
      navigate(`/tutors/add-lecture/${courseId}`);
    } catch (error) {
      setErrorMessage((error as Error).message);
      console.log(error);
    } finally {
      setStatus("");
      setSubmitting(false)
    }
  };

  return (
    <Box sx={{ minWidth: "100vw", bgcolor: "#f1f5f9", py: 6 }}>
      <Navbar searchQuery={searchQuery} onSearchChange={handleSearchChange} />

      <Box sx={{ maxWidth: "900px", mx: "auto", mt: 6, px: { xs: 3, md: 0 } }}>
        <Card
          sx={{
            bgcolor: "white",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <CardContent sx={{ p: { xs: 4, md: 6 } }}>
            <Typography
              variant="h4"
              sx={{
                mb: 2,
                fontWeight: "bold",
                color: "#1e293b",
                textAlign: "center",
              }}
            >
              Create a New Course
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, textAlign: "center" }}
            >
              Share your knowledge and inspire learners by creating a compelling
              course.
            </Typography>

            <Formik
              initialValues={{
                title: "",
                description: "",
                category: "select",
                price: "",
                thumbnail: null,
              }}
              validationSchema={CreateCourseSchema}
              onSubmit={handleCreateCourse}
            >
              {({ values, setFieldValue, isSubmitting, touched, errors }) => (
                <Form>
                  {/* Error Message */}
                  {errorMessage && (
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: "#FFECEC",
                        border: "1px solid #F87171",
                        borderRadius: 2,
                        mb: 3,
                      }}
                    >
                      <Typography color="error">{errorMessage}</Typography>
                    </Paper>
                  )}

                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 3 }}
                  >
                    <Field
                      name="title"
                      as={TextField}
                      label="Course Title"
                      variant="outlined"
                      fullWidth
                      error={touched.title && Boolean(errors.title)}
                      helperText={touched.title && errors.title}
                    />

                    <Field
                      name="description"
                      as={TextField}
                      label="Course Description"
                      variant="outlined"
                      multiline
                      rows={4}
                      fullWidth
                      error={touched.description && Boolean(errors.description)}
                      helperText={touched.description && errors.description}
                    />

                    <Grid container spacing={3}>
                      {/* Category */}
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Category</InputLabel>
                          <Field
                            name="category"
                            as={Select}
                            label="Category"
                            error={touched.category && Boolean(errors.category)}
                          >
                            <MenuItem value="select" disabled>
                              Select a category
                            </MenuItem>
                            {categories.map((cat) => (
                              <MenuItem key={cat} value={cat}>
                                {cat}
                              </MenuItem>
                            ))}
                          </Field>
                          {touched.category && errors.category && (
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{ mt: 1 }}
                            >
                              {errors.category}
                            </Typography>
                          )}
                        </FormControl>
                      </Grid>

                      {/* Price */}
                      <Grid item xs={12} md={6}>
                        <Field
                          name="price"
                          as={TextField}
                          type="number"
                          label="Price"
                          variant="outlined"
                          fullWidth
                          error={touched.price && Boolean(errors.price)}
                          helperText={touched.price && errors.price}
                        />
                      </Grid>
                    </Grid>

                    <Box>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        Course Thumbnail
                      </Typography>
                      <Paper
                        variant="outlined"
                        component="label"
                        sx={{
                          height: 250,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          bgcolor: "#f8fafc",
                          border: "2px dashed #cbd5e1",
                          borderRadius: 4,
                          "&:hover": {
                            bgcolor: "#f1f5f9",
                          },
                        }}
                      >
                        <input
                          type="file"
                          hidden
                          onChange={(e) =>
                            setFieldValue(
                              "thumbnail",
                              e.target.files ? e.target.files[0] : null
                            )
                          }
                          accept="image/*"
                        />
                        <Box sx={{ textAlign: "center" }}>
                          {values.thumbnail ? (
                            <Typography variant="body2" color="text.secondary">
                              {values.thumbnail.name}
                            </Typography>
                          ) : (
                            <>
                              <UploadIcon
                                sx={{ fontSize: 48, color: "#94a3b8", mb: 1 }}
                              />
                              <Typography color="text.secondary">
                                Click to upload course thumbnail
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Paper>
                      {touched.thumbnail && errors.thumbnail && (
                        <Typography
                          variant="caption"
                          color="error"
                          sx={{ mt: 1 }}
                        >
                          {errors.thumbnail}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mt: 4,
                    }}
                  >
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={isSubmitting || status === "loading"}
                      sx={{
                        px: 5,
                        py: 1.5,
                        borderRadius: 4,
                        bgcolor: "#2563eb",
                        fontWeight: "bold",
                        "&:hover": {
                          bgcolor: "#1e40af",
                        },
                      }}
                    >
                      {status === "loading" ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        "Create Course"
                      )}
                    </Button>
                  </Box>
                </Form>
              )}
            </Formik>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default CreateCourseSection;

