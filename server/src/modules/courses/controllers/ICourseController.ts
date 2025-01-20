import { Request, Response } from "express";

export interface ICourseController {
  createCourse(req: Request, res: Response): Promise<void>;
  getAllCourses(req: Request, res: Response): Promise<void>;
  getCategories(req: Request, res: Response): Promise<void>;
}