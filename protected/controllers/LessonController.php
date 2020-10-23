<?php

class LessonController extends Controller
{
	/**
	 * @var string the default layout for the views. Defaults to '//layouts/column2', meaning
	 * using two-column layout. See 'protected/views/layouts/column2.php'.
	 */
	public $layout='//layouts/column1';

	/**
	 * @return array action filters
	 */
	public function filters()
	{
		return array(
			'accessControl', // perform access control for CRUD operations
		);
	}

	/**
	 * Specifies the access control rules.
	 * This method is used by the 'accessControl' filter.
	 * @return array access control rules
	 */
	public function accessRules()
	{
		$manager='';
        $teacher='';
		if (Yii::app()->request->getParam('id')){
            $lesson = Lesson::model()->findByPk(Yii::app()->request->getParam('id'));
            if(Yii::app()->user->getId() == $lesson->school->userManager_id) {
				$manager = Yii::app()->user->name;				
			}
            if(Yii::app()->user->getId() == $lesson->userTeacher_id) {
				$teacher = Yii::app()->user->name;				
			}
		}
		return array(
			array('allow',  // allow all users to perform 'index' and 'view' actions
				'actions'=>array('index','view'),
				'users'=>array('*'),
			),
			array('allow', // allow authenticated user to perform 'create' and 'update' actions
				'actions'=>array('create', 'isPrivate', 'subscribe', 'unsubscribe', 'adminStudents'),
				'users'=>array('@'),
			),
			array('allow', // allow manager and teacher users to perform 'update'
				'actions'=>array('update'),
				'users'=>array($manager,$teacher,'admin'),
			),
			array('allow', // allow admin user to perform 'admin' and 'delete' actions
				'actions'=>array('admin','delete'),
				'expression'=>'Yii::app()->user->isAdmin()',
			),
			array('deny',  // deny all users
				'users'=>array('*'),
			),
		);
	}

	/**
	 * Displays a particular model.
	 * @param integer $id the ID of the model to be displayed
	 */
	public function actionView($id)
	{
		$this->layout = '//layouts/column2';
		$this->render('view',array(
			'model'=>$this->loadModel($id),
		));
	}

	/**
	 * Creates a new model.
	 * If creation is successful, the browser will be redirected to the 'view' page.
	 */
	public function actionCreate()
	{
		$model=new Lesson;

		// Uncomment the following line if AJAX validation is needed
		// $this->performAjaxValidation($model);

		if(isset($_POST['Lesson']))
		{
			$model->attributes=$_POST['Lesson'];
			$model->userCreate_id=Yii::app()->user->id;
			if ($model->school->private == 1){
				$model->private = 1;
			}
			if($model->save())
				$this->redirect(array('view','id'=>$model->id));
		}

		$this->render('create',array(
			'model'=>$model,
		));
	}

	/**
	 * Updates a particular model.
	 * If update is successful, the browser will be redirected to the 'view' page.
	 * @param integer $id the ID of the model to be updated
	 */
	public function actionUpdate($id)
	{
		$model=$this->loadModel($id);

		// Uncomment the following line if AJAX validation is needed
		// $this->performAjaxValidation($model);

		if(isset($_POST['Lesson']))
		{
			$model->attributes=$_POST['Lesson'];
			if ($model->school->private == 1){
				$model->private = 1;
			}
			if($model->save())
				$this->redirect(array('view','id'=>$model->id));
		}

		$this->render('update',array(
			'model'=>$model,
		));
	}
	
	public function actionSubscribe($id)
	{
		$model=$this->loadModel($id);
		
		$inscription = new Userlesson;
		$inscription->lesson_id = $model->id;
		$inscription->user_id = Yii::app()->user->id;
		
		$log = new LogInscription;
		$log->user_id = Yii::app()->user->id;
		$log->lesson_id = $model->id;
		$log->date = date('Y-m-d');
		
		if ($model->openInscription){
			$inscription->pending = 0;
			$log->comment = 'registered';
		} else {
			$inscription->pending = 1;
			$log->comment = 'pending';
		}

		$inscription->save();
		$log->save();
		$this->redirect(array('view','id'=>$model->id));
	}
	
	public function actionUnsubscribe($id)
	{
		$model=$this->loadModel($id);
		
		$inscription = UserLesson::model()->findByAttributes(array('user_id'=>Yii::app()->user->id, 'lesson_id'=>$model->id));
				
		$log = new LogInscription;
		$log->user_id = Yii::app()->user->id;
		$log->lesson_id = $model->id;
		$log->date = date('Y-m-d');
		
		if ($inscription->pending){
			$log->comment = 'canceled';
		} else {
			$log->comment = 'unsubscribed';
		}

		$inscription->delete();
		$log->save();
		$this->redirect(array('view','id'=>$model->id));
	}

	/**
	 * Deletes a particular model.
	 * If deletion is successful, the browser will be redirected to the 'admin' page.
	 * @param integer $id the ID of the model to be deleted
	 */
	public function actionDelete($id)
	{
		if(Yii::app()->request->isPostRequest)
		{
			// we only allow deletion via POST request
			$this->loadModel($id)->delete();

			// if AJAX request (triggered by deletion via admin grid view), we should not redirect the browser
			if(!isset($_GET['ajax']))
				$this->redirect(isset($_POST['returnUrl']) ? $_POST['returnUrl'] : array('admin'));
		}
		else
			throw new CHttpException(400,'Invalid request. Please do not repeat this request again.');
	}

	/**
	 * Lists all models.
	 */
	public function actionIndex()
	{
		$dataProvider=new CActiveDataProvider('Lesson');
		$this->render('index',array(
			'dataProvider'=>$dataProvider,
		));
	}

	/**
	 * Manages all models.
	 */
	public function actionAdmin()
	{
		$model=new Lesson('search');
		$model->unsetAttributes();  // clear any default values
		if(isset($_GET['Lesson']))
			$model->attributes=$_GET['Lesson'];

		$this->render('admin',array(
			'model'=>$model,
		));
	}
	
	public function actionAdminStudents()
	{
		$model=new User('search');
		$model->unsetAttributes();  // clear any default values
		if(isset($_GET['User']))
			$model->attributes=$_GET['User'];

		$this->render('adminStudents',array(
			'model'=>$model,
		));
	}

	/**
	 * Returns the data model based on the primary key given in the GET variable.
	 * If the data model is not found, an HTTP exception will be raised.
	 * @param integer the ID of the model to be loaded
	 */
	public function loadModel($id)
	{
		$model=Lesson::model()->findByPk($id);
		if($model===null)
			throw new CHttpException(404,'The requested page does not exist.');
		return $model;
	}

	/**
	 * Performs the AJAX validation.
	 * @param CModel the model to be validated
	 */
	protected function performAjaxValidation($model)
	{
		if(isset($_POST['ajax']) && $_POST['ajax']==='lesson-form')
		{
			echo CActiveForm::validate($model);
			Yii::app()->end();
		}
	}
	
	public function actionIsPrivate()
	{		
		$lesson=Lesson::model()->findByPk((int)$_POST['idLesson']);		
		echo $lesson->private;		
	}
	
	 protected function getLessonComment($data,$row)
     {
        $theCellValue="valeur inconnue";
		if ($data->comment == 'pending'){
			$theCellValue="Demande en cours de validation";
		} 
		else if ($data->comment == 'registered' or $data->comment == 'accepted'){
			$theCellValue="Inscription validée";
		} 
		else if ($data->comment == 'canceled'){
			$theCellValue="Inscription annulée";
		} 
		else if ($data->comment == 'refused'){
			$theCellValue="Inscription refusée";
		} 
		else if ($data->comment == 'unsubscribed'){
			$theCellValue="L'utilisateur s'est désinscrit";
		} 
		else if ($data->comment == 'deleted'){
			$theCellValue="L'utilisateur a été supprimé de ce cours";
		} 
		return $theCellValue;    
    }  
}
