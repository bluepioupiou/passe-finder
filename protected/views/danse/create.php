<?php
$this->breadcrumbs=array(
	'Danses'=>array('index'),
	'Create',
);

$this->menu=array(
	array('label'=>'List Danse', 'url'=>array('index')),
	array('label'=>'Manage Danse', 'url'=>array('admin')),
);
?>

<h1>Create Danse</h1>

<?php echo $this->renderPartial('_form', array('model'=>$model)); ?>