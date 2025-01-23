import { handleAxiosError } from "../utils/errorHandler";
import { axiosInstance } from "./axiosInstance"

export const addLecture = async(formData: FormData) => {
// export const addLecture = async(formData : FormData) => {
    try {
        const response = await axiosInstance.post("/lectures", formData,);
        console.log('resp in video upload', response);
        
        return response.data;
    } catch (error) {
      console.log('errror is', error);
      
        throw handleAxiosError(error)
    }
}

export const getLecturesByCourseId = async (courseId: string) => {
  try {
    const response = await axiosInstance.get(`/courses/${courseId}/lectures`);
    return response.data; 
  } catch (error) {
    // throw new Error(`Error fetching lectures: ${(error as Error).message}`);
    throw handleAxiosError(error);
  }
  
};

// export const updateLecture = async (lectureId: string, lectureData: FormData) => {
//     const response = await axiosInstance.put(`/lecture/${lectureId}`, lectureData);
//     return response.data;
// };
